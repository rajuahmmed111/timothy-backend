import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import stripe from "../../../helpars/stripe";
import {
  BookingStatus,
  EveryServiceStatus,
  PaymentStatus,
  UserStatus,
} from "@prisma/client";
import config from "../../../config";
import Stripe from "stripe";
import { mapStripeStatusToPaymentStatus } from "./Stripe/stripe";

// stripe account onboarding
const stripeAccountOnboarding = async (userId: string) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // if user already has stripe account
  if (user.stripeAccountId) {
    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    const cardPayments = account.capabilities?.card_payments;
    const transfers = account.capabilities?.transfers;
    const requirements = account.requirements?.currently_due || [];

    // if verified
    if (cardPayments === "active" && transfers === "active") {
      // update DB to mark as connected
      await prisma.user.update({
        where: { id: user.id },
        data: { isStripeConnected: true },
      });

      return {
        status: "verified",
        message: "Stripe account verified successfully.",
        capabilities: account.capabilities,
      };
    }

    // if not verified → generate onboarding link
    const accountLinks = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${config.stripe.refreshUrl}?accountId=${user.stripeAccountId}`,
      return_url: config.stripe.returnUrl,
      type: "account_onboarding",
    });

    // update DB to store stripeAccountId & mark connected
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeAccountId: user.stripeAccountId,
        isStripeConnected: true,
      },
    });

    return {
      status: requirements.length > 0 ? "requirements_due" : "pending",
      message:
        requirements.length > 0
          ? "Additional information required for Stripe verification."
          : "Your Stripe account verification is under review.",
      requirements,
      onboardingLink: accountLinks.url,
    };
  }

  // if user has no stripe account → create new account
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: user?.email,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        schedule: {
          delay_days: 2, // ✅ minimum allowed
        },
      },
    },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${config.stripe.refreshUrl}?accountId=${account.id}`,
    return_url: config.stripe.returnUrl,
    type: "account_onboarding",
  });

  // update DB with stripeAccountId & mark connected
  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeAccountId: account.id,
      isStripeConnected: true,
    },
  });

  return {
    status: "pending",
    message: "Your Stripe account verification is under review.",
    capabilities: account.capabilities,
    onboardingLink: accountLink.url,
  };
};

// checkout session on stripe
const createCheckoutSession = async (
  userId: string,
  bookingId: string,
  description: string
) => {
  // find user
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // find booking
  const booking = await prisma.car_Booking.findUnique({
    where: { id: bookingId, userId },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  // find car
  const car = await prisma.car_Rental.findUnique({
    where: { id: booking.carId },
  });
  if (!car) {
    throw new ApiError(httpStatus.NOT_FOUND, "Car not found");
  }

  // find partner
  const partner = await prisma.user.findUnique({
    where: { id: car.partnerId, status: UserStatus.ACTIVE },
  });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // check partner stripe account
  if (!partner.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Provider not onboarded with Stripe"
    );
  }

  const amount = Math.round(booking.totalPrice * 100);
  const adminFee = Math.round(amount * 0.2);

  // create checkout session
  const checkoutSession = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Car Booking",
              description: description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${config.stripe.checkout_success_url}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.stripe.checkout_cancel_url}`,
      payment_intent_data: {
        application_fee_amount: adminFee,
        transfer_data: { destination: partner.stripeAccountId },
        description: description,
      },
      metadata: {
        bookingId: booking.id,
        userId: user.id,
        fullName: user.fullName ?? "",
        email: user.email,
        contactNumber: user.contactNumber ?? "",
        country: user.country ?? "",
      },
    }
    // { idempotencyKey: `create_session_booking_${booking.id}` } // for idempotency only one time booking
  );

  // update booking
  await prisma.car_Booking.update({
    where: { id: booking.id },
    data: { checkoutSessionId: checkoutSession.id },
  });

  // save payment record
  await prisma.payment.create({
    data: {
      amount: amount,
      description: description,
      currency: checkoutSession.currency,
      sessionId: checkoutSession.id,
      paymentMethod: checkoutSession.payment_method_types.join(","),
      status: mapStripeStatusToPaymentStatus(checkoutSession.payment_status),
      provider: "STRIPE",
      payable_name: user.fullName ?? "",
      payable_email: user.email,
      country: user.country ?? "",
      admin_commission: adminFee,
      serviceType: "CAR",
      partnerId: partner.id,
      userId: user.id,
      car_bookingId: booking.id,
    },
  });

  return {
    checkoutUrl: checkoutSession.url,
    checkoutSessionId: checkoutSession.id,
  };
};

// stripe webhook payment
const stripeHandleWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.id;
      const paymentIntentId = session.payment_intent as string;

      // paymentIntent retrieve
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (!paymentIntent.latest_charge) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "No charge found in PaymentIntent"
        );
      }

      // Service Provider received amount
      let providerReceived = 0;
      if (paymentIntent.transfer_data?.destination) {
        const amountReceived = paymentIntent.amount_received ?? 0;
        const applicationFee = paymentIntent.application_fee_amount ?? 0;
        providerReceived = (amountReceived - applicationFee) / 100; // USD
      }

      // find Payment
      const payment = await prisma.payment.findFirst({
        where: { sessionId },
      });

      if (!payment) {
        console.log(`No payment found for session: ${sessionId}`);
        break;
      }

      // update Payment to PAID
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          payment_intent: paymentIntentId,
          service_fee: providerReceived,
        },
      });

      // find car_booking associated with this payment
      const carBooking = await prisma.car_Booking.findFirst({
        where: { payment: { some: { id: payment.id } } },
      });

      if (carBooking) {
        // update booking status to CONFIRMED
        await prisma.car_Booking.update({
          where: { id: carBooking.id },
          data: {
            bookingStatus: BookingStatus.CONFIRMED,
          },
        });

        // update car_rental status to BOOKED
        await prisma.car_Rental.update({
          where: { id: carBooking.carId },
          data: {
            isBooked: EveryServiceStatus.BOOKED,
          },
        });
      }

      break;
    }

    default:
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid event type");
  }
};

export const PaymentService = {
  stripeAccountOnboarding,
  createCheckoutSession,
  stripeHandleWebhook,
};
