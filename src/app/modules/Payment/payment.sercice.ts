import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import stripe from "../../../helpars/stripe";
import {
  BookingStatus,
  EveryServiceStatus,
  PaymentStatus,
} from "@prisma/client";
import config from "../../../config";
import Stripe from "stripe";
import {
  mapStripeStatusToPaymentStatus,
  serviceConfig,
  ServiceType,
} from "./Stripe/stripe";
import axios from "axios";

const payStackBaseUrl = "https://api.paystack.co";

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
  serviceType: string,
  bookingId: string,
  description: string
) => {
  let booking: any;
  let service: any;
  let partner: any;
  let serviceName: string;
  let partnerId: string;
  let totalPrice: number;

  switch (serviceType) {
    case "CAR":
      booking = await prisma.car_Booking.findUnique({
        where: { id: bookingId, userId },
      });
      if (!booking)
        throw new ApiError(httpStatus.NOT_FOUND, "Car booking not found");

      service = await prisma.car_Rental.findUnique({
        where: { id: booking.carId },
      });
      if (!service) throw new ApiError(httpStatus.NOT_FOUND, "Car not found");

      partnerId = service.partnerId;
      serviceName = service.carName;
      totalPrice = booking.totalPrice;
      break;

    case "HOTEL":
      booking = await prisma.hotel_Booking.findUnique({
        where: { id: bookingId, userId },
      });
      if (!booking)
        throw new ApiError(httpStatus.NOT_FOUND, "Hotel booking not found");

      service = await prisma.hotel.findUnique({
        where: { id: booking.hotelId },
      });
      if (!service) throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");

      partnerId = service.partnerId;
      serviceName = service.hotelName;
      totalPrice = booking.totalPrice;
      break;

    case "SECURITY":
      booking = await prisma.security_Booking.findUnique({
        where: { id: bookingId, userId },
      });
      if (!booking)
        throw new ApiError(httpStatus.NOT_FOUND, "Security booking not found");

      service = await prisma.security_Protocol.findUnique({
        where: { id: booking.securityId },
      });
      if (!service)
        throw new ApiError(httpStatus.NOT_FOUND, "Security service not found");

      partnerId = service.partnerId;
      serviceName = service.securityName;
      totalPrice = booking.totalPrice;
      break;

    case "ATTRACTION":
      booking = await prisma.attraction_Booking.findUnique({
        where: { id: bookingId, userId },
      });
      if (!booking)
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Attraction booking not found"
        );

      service = await prisma.attraction.findUnique({
        where: { id: booking.attractionId },
      });
      if (!service)
        throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");

      partnerId = service.partnerId!;
      serviceName = service.attractionName;
      totalPrice = booking.totalPrice;
      break;

    default:
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid service type");
  }

  // find partner
  partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner || !partner.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Provider not onboarded with Stripe"
    );
  }

  const amount = Math.round(totalPrice * 100);
  const adminFee = Math.round(amount * 0.2);

  // create Stripe checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: serviceName,
            description,
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
      description,
    },
    metadata: {
      bookingId: booking.id,
      userId,
      serviceType,
    },
  });

  // update booking with checkoutSessionId
  switch (serviceType) {
    case "CAR":
      await prisma.car_Booking.update({
        where: { id: booking.id },
        data: { checkoutSessionId: checkoutSession.id },
      });
      break;
    case "HOTEL":
      await prisma.hotel_Booking.update({
        where: { id: booking.id },
        data: { checkoutSessionId: checkoutSession.id },
      });
      break;
    case "SECURITY":
      await prisma.security_Booking.update({
        where: { id: booking.id },
        data: { checkoutSessionId: checkoutSession.id },
      });
      break;
    case "ATTRACTION":
      await prisma.attraction_Booking.update({
        where: { id: booking.id },
        data: { checkoutSessionId: checkoutSession.id },
      });
      break;
  }

  // save payment record
  await prisma.payment.create({
    data: {
      amount,
      description,
      currency: checkoutSession.currency,
      sessionId: checkoutSession.id,
      paymentMethod: checkoutSession.payment_method_types.join(","),
      status: PaymentStatus.UNPAID,
      provider: "STRIPE",
      payable_name: partner.fullName ?? "",
      payable_email: partner.email,
      country: partner.country ?? "",
      admin_commission: adminFee,
      serviceType,
      partnerId,
      userId,
      car_bookingId: serviceType === "CAR" ? booking.id : undefined,
      hotel_bookingId: serviceType === "HOTEL" ? booking.id : undefined,
      security_bookingId: serviceType === "SECURITY" ? booking.id : undefined,
      attraction_bookingId:
        serviceType === "ATTRACTION" ? booking.id : undefined,
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

      // retrieve paymentIntent
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (!paymentIntent.latest_charge) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "No charge found in PaymentIntent"
        );
      }

      // calculate provider received
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

      // --- Car Booking ---
      const carBooking = await prisma.car_Booking.findFirst({
        where: { payment: { some: { id: payment.id } } },
      });

      if (carBooking) {
        await prisma.car_Booking.update({
          where: { id: carBooking.id },
          data: { bookingStatus: BookingStatus.CONFIRMED },
        });

        await prisma.car_Rental.update({
          where: { id: carBooking.carId },
          data: { isBooked: EveryServiceStatus.BOOKED },
        });
      }

      // --- Hotel Booking ---
      const hotelBooking = await prisma.hotel_Booking.findFirst({
        where: { payment: { some: { id: payment.id } } },
      });

      if (hotelBooking) {
        await prisma.hotel_Booking.update({
          where: { id: hotelBooking.id },
          data: { bookingStatus: BookingStatus.CONFIRMED },
        });

        await prisma.hotel.update({
          where: { id: hotelBooking.hotelId },
          data: { isBooked: EveryServiceStatus.BOOKED },
        });
      }

      // --- Security Booking ---
      const securityBooking = await prisma.security_Booking.findFirst({
        where: { payment: { some: { id: payment.id } } },
      });

      if (securityBooking) {
        await prisma.security_Booking.update({
          where: { id: securityBooking.id },
          data: { bookingStatus: BookingStatus.CONFIRMED },
        });

        await prisma.security_Protocol.update({
          where: { id: securityBooking.securityId },
          data: { isBooked: EveryServiceStatus.BOOKED },
        });
      }

      // --- Attraction Booking ---
      const attractionBooking = await prisma.attraction_Booking.findFirst({
        where: { payment: { some: { id: payment.id } } },
      });

      if (attractionBooking) {
        await prisma.attraction_Booking.update({
          where: { id: attractionBooking.id },
          data: { bookingStatus: BookingStatus.CONFIRMED },
        });

        await prisma.attraction.update({
          where: { id: attractionBooking.attractionId },
          data: { isBooked: EveryServiceStatus.BOOKED },
        });
      }

      break;
    }

    default:
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid event type");
  }
};

// cancel booking service
const cancelBooking = async (
  serviceType: string,
  bookingId: string,
  userId: string
) => {
  // detect booking model dynamically
  const bookingModelMap: Record<string, any> = {
    car: prisma.car_Booking,
    hotel: prisma.hotel_Booking,
    security: prisma.security_Booking,
    attraction: prisma.attraction_Booking,
  };

  const serviceModelMap: Record<string, any> = {
    car: prisma.car_Rental,
    hotel: prisma.hotel,
    security: prisma.security_Protocol,
    attraction: prisma.attraction,
  };

  const bookingModel = bookingModelMap[serviceType.toLowerCase()];
  const serviceModel = serviceModelMap[serviceType.toLowerCase()];

  if (!bookingModel || !serviceModel) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid service type");
  }

  // find booking with payment & user
  const booking = await bookingModel.findUnique({
    where: { id: bookingId, userId },
    include: { payment: true, user: true },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const user = booking.user;
  if (!user.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User has no connected Stripe account"
    );
  }

  // get payment
  const payment = booking.payment?.[0];
  if (!payment || !payment.payment_intent) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No payment found for this booking"
    );
  }

  // stripe full refund on connected account
  await stripe.refunds.create(
    {
      payment_intent: payment.payment_intent,
      amount: payment.amount, // full refund
    },
    {
      stripeAccount: user.stripeAccountId, // connected account
    }
  );

  // update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.REFUNDED },
  });

  // update booking status to CANCELLED
  await bookingModel.update({
    where: { id: bookingId },
    data: { bookingStatus: BookingStatus.CANCELLED },
  });

  // free the service again (isBooked = AVAILABLE)
  const serviceIdField = `${serviceType.toLowerCase()}Id`;
  await serviceModel.update({
    where: { id: booking[serviceIdField] },
    data: { isBooked: "AVAILABLE" },
  });

  return { bookingId, status: "CANCELLED" };
};

//
// pay-stack sub account
const payStackAccountSubAccount = async (userId: string, accountData: any) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");


};

// create checkout session on paystack
const createCheckoutSessionPayStack = async (
  userId: string,
  serviceType: string,
  bookingId: string,
  description: string
) => {
  const serviceT = serviceConfig[serviceType as ServiceType];
  if (!serviceT)
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid service type");

  // find booking
  const booking = await serviceT.bookingModel.findUnique({
    where: { id: bookingId, userId },
  });
  if (!booking)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `${serviceType} booking not found`
    );

  // find service
  const service = await serviceT.serviceModel.findUnique({
    where: { id: (booking as any)[`${serviceType.toLowerCase()}Id`] },
  });
  if (!service)
    throw new ApiError(httpStatus.NOT_FOUND, `${serviceType} not found`);

  // find partner
  const partnerId = (service as any).partnerId;
  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner)
    throw new ApiError(httpStatus.BAD_REQUEST, "Provider not found");

  const amount = Math.round(booking.totalPrice * 100);
  const adminFee = Math.round(amount * 0.2);

  // Call Paystack API → initialize transaction
  const response = await axios.post(
    `${payStackBaseUrl}/transaction/initialize`,
    {
      email: partner.email,
      amount,
      metadata: {
        userId,
        serviceType,
        bookingId,
        partnerId,
        description,
        adminFee,
      },
      callback_url: `${config.frontend_url}/payment/success`,
    },
    {
      headers: {
        Authorization: `Bearer ${config.payStack.secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = response.data.data;

  // Save payment record
  await prisma.payment.create({
    data: {
      amount,
      description,
      currency: "NGN",
      sessionId: data.reference,
      paymentMethod: "card",
      status: PaymentStatus.UNPAID,
      provider: "PAYSTACK",
      payable_name: partner.fullName ?? "",
      payable_email: partner.email,
      country: partner.country ?? "",
      admin_commission: adminFee,
      serviceType,
      partnerId,
      userId,
      [serviceT.serviceTypeField]: booking.id,
    },
  });

  return {
    checkoutUrl: data.authorization_url,
    reference: data.reference,
  };
};

const payStackHandleWebhook = async (event: any) => {
  if (event.event === "charge.success") {
    const reference = event.data.reference;

    // find payment
    const payment = await prisma.payment.findFirst({
      where: { sessionId: reference },
    });
    if (!payment) return;

    // update payment to PAID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        transactionId: event.data.id,
      },
    });

    // update booking status → CONFIRMED
    const config = serviceConfig[payment.serviceType as ServiceType];
    if (!config) return;

    const booking = await config.bookingModel.findUnique({
      where: { id: (payment as any)[config.serviceTypeField] },
    });
    if (!booking) return;

    await config.bookingModel.update({
      where: { id: booking.id },
      data: { bookingStatus: BookingStatus.CONFIRMED },
    });

    await config.serviceModel.update({
      where: { id: (booking as any)[`${payment.serviceType.toLowerCase()}Id`] },
      data: { isBooked: EveryServiceStatus.BOOKED },
    });
  }
};

// pay-stack cancel booking
const cancelPayStackBooking = async (
  serviceType: string,
  bookingId: string,
  userId: string
) => {
  const serviceT = serviceConfig[serviceType as ServiceType];
  if (!serviceT)
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid service type");

  const booking = await serviceT.bookingModel.findUnique({
    where: { id: bookingId, userId },
    include: { payment: true },
  });
  if (!booking) throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");

  const payment = booking.payment?.[0];
  if (!payment || !payment.transactionId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No payment found for this booking"
    );
  }

  // Paystack refund API
  await axios.post(
    `${payStackBaseUrl}/refund`,
    { transaction: payment.transactionId },
    { headers: { Authorization: `Bearer ${config.payStack.secretKey}` } }
  );

  // update DB
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.REFUNDED },
  });

  await serviceT.bookingModel.update({
    where: { id: bookingId },
    data: { bookingStatus: BookingStatus.CANCELLED },
  });

  await serviceT.serviceModel.update({
    where: { id: (booking as any)[`${serviceType.toLowerCase()}Id`] },
    data: { isBooked: "AVAILABLE" },
  });

  return { bookingId, status: "CANCELLED" };
};

export const PaymentService = {
  stripeAccountOnboarding,
  createCheckoutSession,
  stripeHandleWebhook,
  cancelBooking,
  payStackAccountSubAccount,
  createCheckoutSessionPayStack,
  payStackHandleWebhook,
  cancelPayStackBooking,
};
