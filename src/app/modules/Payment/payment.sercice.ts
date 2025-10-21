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
import {
  mapStripeStatusToPaymentStatus,
  serviceConfig,
  ServiceType,
} from "./Stripe/stripe";
import axios from "axios";
import {
  BookingNotificationService,
  IBookingNotificationData,
  ServiceTypes,
} from "../../../shared/notificationService";
import * as crypto from "crypto";

const callback_url = "https://paystack.com/pay";
const payStackBaseUrl = "https://api.paystack.co";
const headers = {
  Authorization: `Bearer ${config.payStack.secretKey}`,
  "Content-Type": "application/json",
};

// --------------------------- Stripe ---------------------------

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
      return_url: `${config.stripe.returnUrl}?accountId=${user.stripeAccountId}`,
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
          delay_days: 2, // minimum allowed
        },
      },
    },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${config.stripe.refreshUrl}?accountId=${account.id}`,
    return_url: `${config.stripe.returnUrl}?accountId=${account.id}`,
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

const ensureUserStripeAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  // Create onboarding link helper
  const createOnboardingLink = async (accountId: string) => {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${config.stripe.refreshUrl}?accountId=${accountId}`,
      return_url: `${config.stripe.returnUrl}?accountId=${accountId}`,
      type: "account_onboarding",
    });
    return link.url;
  };

  // If user has no Stripe account → create one
  if (!user.stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: { payouts: { schedule: { delay_days: 2 } } },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: account.id, isStripeConnected: false },
    });

    const onboardingLink = await createOnboardingLink(account.id);
    return { status: "onboarding_required", onboardingLink };
  }

  // User has a Stripe account → check capabilities
  const account = await stripe.accounts.retrieve(user.stripeAccountId);

  if (
    account.capabilities?.card_payments !== "active" ||
    account.capabilities?.transfers !== "active"
  ) {
    const onboardingLink = await createOnboardingLink(user.stripeAccountId);
    return { status: "onboarding_required", onboardingLink };
  }

  // Optional: check balance
  const balance = await stripe.balance.retrieve({
    stripeAccount: user.stripeAccountId,
  });

  return { status: "active", stripeAccountId: user.stripeAccountId, balance };
};

// checkout session on stripe
const createStripePaymentIntent = async (
  userId: string,
  serviceType: string,
  bookingId: string,
  description: string,
  country: string
) => {
  let booking: any;
  let service: any;
  let partner: any;
  let serviceName: string;
  let partnerId: string;
  let totalPrice: number;

  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  switch (serviceType) {
    case "CAR":
      booking = await prisma.car_Booking.findUnique({
        where: { id: bookingId, userId },
      });
      if (!booking)
        throw new ApiError(httpStatus.NOT_FOUND, "Car booking not found");

      service = await prisma.car.findUnique({
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

      service = await prisma.room.findUnique({
        where: { id: booking.roomId },
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

      service = await prisma.security_Guard.findUnique({
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

      service = await prisma.appeal.findUnique({
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

  // amount (convert USD → cents)
  const amount = Math.round(totalPrice * 100);

  // add 5% vat
  const vatPercentage = 5;
  const vatAmount = Math.round(amount * (vatPercentage / 100));

  // total amount with 5% vat
  const totalWithVAT = amount + vatAmount;

  // 15% admin commission
  const adminCommissionPercentage = 15;
  const adminCommission = Math.round(
    amount * (adminCommissionPercentage / 100)
  );

  // total admin earnings
  const adminFee = adminCommission + vatAmount;

  // service fee (partner earnings)
  const serviceFee = totalWithVAT - adminFee;

  // create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalWithVAT,
    currency: "usd",
    payment_method_types: ["card"],
    application_fee_amount: adminFee, // goes to Admin
    transfer_data: {
      destination: partner.stripeAccountId, // goes to Partner
    },
    description: description,
    metadata: {
      bookingId: booking.id,
      userId,
      serviceType,
    },
    // Optional: Setup future usage if you want to save card
    // setup_future_usage: 'on_session',
  });

  // update booking with checkoutSessionId
  switch (serviceType) {
    case "CAR":
      await prisma.car_Booking.update({
        where: { id: booking.id },
        data: { checkoutSessionId: paymentIntent.id },
      });
      break;
    case "HOTEL":
      await prisma.hotel_Booking.update({
        where: { id: booking.id },
        data: { checkoutSessionId: paymentIntent.id },
      });
      break;
    case "SECURITY":
      await prisma.security_Booking.update({
        where: { id: booking.id },
        data: { checkoutSessionId: paymentIntent.id },
      });
      break;
    case "ATTRACTION":
      await prisma.attraction_Booking.update({
        where: { id: booking.id },
        data: { checkoutSessionId: paymentIntent.id },
      });
      break;
  }

  // save payment record
  await prisma.payment.create({
    data: {
      amount: totalWithVAT,
      description,
      currency: paymentIntent.currency,
      sessionId: paymentIntent.id,
      paymentMethod: paymentIntent.payment_method_types.join(","),
      status: PaymentStatus.UNPAID,
      provider: "STRIPE",
      payable_name: partner.fullName ?? "",
      payable_email: partner.email,
      country: partner.country ?? "",
      admin_commission: adminFee, // 15%
      service_fee: serviceFee, // partner earning
      vat_amount: vatAmount, // 5% transaction admin account
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
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: totalPrice,
  };
};

// stripe webhook payment
const stripeHandleWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const paymentIntentId = paymentIntent.id;

      // find Payment
      const payment = await prisma.payment.findFirst({
        where: { sessionId: paymentIntentId },
      });
      if (!payment) {
        console.log(`No payment found for payment intent: ${paymentIntentId}`);
        break;
      }

      let providerReceived = 0;
      if (paymentIntent.transfer_data?.destination) {
        const amountReceived = paymentIntent.amount_received ?? 0;
        const applicationFee = paymentIntent.application_fee_amount ?? 0;
        providerReceived = amountReceived - applicationFee;
      }

      // update Payment to PAID
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status:
            paymentIntent.status === "succeeded"
              ? PaymentStatus.PAID
              : PaymentStatus.UNPAID,
          payment_intent: paymentIntentId,
          service_fee: providerReceived,
        },
      });

      // update booking & service status
      const config = serviceConfig[payment.serviceType as ServiceType];
      if (!config) return;

      const bookingId = (payment as any)[config.serviceTypeField];
      const booking = await config.bookingModel.findUnique({
        where: { id: bookingId },
      });
      if (!booking) return;

      // update booking status → CONFIRMED
      await config.bookingModel.update({
        where: { id: booking.id },
        data: { bookingStatus: BookingStatus.CONFIRMED },
      });

      // update service status → BOOKED
      const serviceId = (booking as any)[
        `${payment.serviceType.toLowerCase()}Id`
      ];
      if (serviceId) {
        await config.serviceModel.update({
          where: { id: serviceId },
          data: { isBooked: EveryServiceStatus.BOOKED },
        });
      }

      // if booking service type SECURITY hoy tahole security protocol ar id dore hiredCount +1 hobe and payment status jodi paid hoy
      if (
        payment.serviceType === "SECURITY" &&
        payment.status === PaymentStatus.PAID
      ) {
        await config.serviceModel.update({
          where: { id: serviceId },
          data: { hiredCount: { increment: 1 } },
        });
      }

      // ---------- send notification ----------
      const service = await config.serviceModel.findUnique({
        where: { id: serviceId },
      });
      if (!service) return;

      const notificationData: IBookingNotificationData = {
        bookingId: booking.id,
        userId: booking.userId,
        partnerId: booking.partnerId,
        serviceTypes: payment.serviceType as ServiceTypes,
        serviceName: service[config.nameField],
        totalPrice: booking.totalPrice,
        // bookedFromDate:
        //   (booking as any).bookedFromDate || (booking as any).date,
        // bookedToDate: (booking as any).bookedToDate,
        // quantity:
        //   (booking as any).rooms ||
        //   (booking as any).adults ||
        //   (booking as any).number_of_security ||
        //   1,
      };

      await BookingNotificationService.sendBookingNotifications(
        notificationData
      );
      break;
    }

    default:
      // console.log(`Ignored Stripe event type: ${event.type}`);
      break;
  }
};

// cancel booking service stripe
const cancelStripeBooking = async (
  serviceType: string,
  bookingId: string,
  userId: string
) => {
  const bookingModelMap: Record<string, any> = {
    car: prisma.car_Booking,
    hotel: prisma.hotel_Booking,
    security: prisma.security_Booking,
    attraction: prisma.attraction_Booking,
  };

  const serviceModelMap: Record<string, any> = {
    car: prisma.car,
    hotel: prisma.room,
    security: prisma.security_Guard,
    attraction: prisma.appeal,
  };

  const bookingModel = bookingModelMap[serviceType.toLowerCase()];
  const serviceModel = serviceModelMap[serviceType.toLowerCase()];

  if (!bookingModel || !serviceModel) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid service type");
  }

  // Booking with payment and user
  const booking = await bookingModel.findUnique({
    where: { id: bookingId, userId },
    include: { payment: true, user: true },
  });

  if (!booking) throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");

  const payment = booking.payment?.[0];
  if (!payment || !payment.payment_intent) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No payment found for this booking"
    );
  }

  // Find the partner (service provider)
  const partner = await prisma.user.findUnique({
    where: { id: payment.partnerId },
  });

  if (!partner || !partner.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Partner has no connected Stripe account"
    );
  }

  // Full refund for main payment_intent
  await stripe.refunds.create({
    payment_intent: payment.payment_intent,
    amount: payment.amount, // full amount
  });

  // Reverse transfer to connected account (provider)
  if (payment.transfer_id && payment.service_fee > 0) {
    await stripe.transfers.createReversal(payment.transfer_id, {
      amount: payment.service_fee,
    });
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.REFUNDED },
  });

  // Update booking status to CANCELLED
  await bookingModel.update({
    where: { id: bookingId },
    data: { bookingStatus: BookingStatus.CANCELLED },
  });

  // Free the service
  const serviceIdField = `${serviceType.toLowerCase()}Id`;
  await serviceModel.update({
    where: { id: booking[serviceIdField] },
    data: { isBooked: EveryServiceStatus.AVAILABLE },
  });

  // Send cancel notification
  const service = await serviceModel.findUnique({
    where: { id: booking[serviceIdField] },
  });

  const notificationData: IBookingNotificationData = {
    bookingId: booking.id,
    userId: booking.userId,
    partnerId: booking.partnerId,
    serviceTypes: serviceType.toUpperCase() as ServiceTypes,
    serviceName: service?.name || "",
    totalPrice: booking.totalPrice,
  };

  await BookingNotificationService.sendCancelNotifications(notificationData);

  return { bookingId, status: "CANCELLED" };
};

// --------------------------- pay-stack ---------------------------

//
// get banks
const getPayStackBanks = async () => {
  const res = await axios.get(`${payStackBaseUrl}/bank`, { headers });
  return res.data.data;
};

// get sub accounts
const getPayStackSubAccounts = async (userId: string) => {
  const res = await axios.get(`${payStackBaseUrl}/subaccount`, { headers });
  return res.data.data;
};

// verify account
const verifyPayStackAccount = async (
  account_number: string,
  bank_code: string
) => {
  const res = await axios.get(
    `${payStackBaseUrl}/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
    { headers }
  );
  return res.data.data;
};

// pay-stack sub account for service user
const payStackAccountSubAccount = async (userId: string, accountData: any) => {
  // Find user
  const partner = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!partner) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  // if sub-account already exists → fetch & return
  if (partner.payStackSubAccountId) {
    const response = await axios.get(
      `${payStackBaseUrl}/subaccount/${partner.payStackSubAccountId}`,
      {
        headers,
      }
    );

    const subAccountData = response.data.data;

    if (subAccountData.active) {
      await prisma.user.update({
        where: { id: userId },
        data: { isPayStackConnected: true },
      });

      return {
        status: "active",
        message: "Pay-stack sub-account already active",
        data: subAccountData,
      };
    }

    return {
      status: "inactive",
      message: "Pay-stack sub-account exists but inactive",
      data: subAccountData,
    };
  }

  // create new sub-account
  try {
    const payload = {
      business_name: accountData.business_name,
      settlement_bank: accountData.settlement_bank, // e.g. "058"
      account_number: accountData.account_number, // e.g. "0123456789"
      percentage_charge: accountData.percentage_charge, // e.g. 20
      primary_contact_email: partner.email,
      currency: accountData.currency || "NGN",
    };

    const response = await axios.post(
      `${payStackBaseUrl}/subaccount`,
      payload,
      {
        headers,
      }
    );

    const subAccountData = response.data.data;

    await prisma.user.update({
      where: { id: userId },
      data: {
        payStackSubAccountId: subAccountData.subaccount_code,
        payStackSubAccount: JSON.stringify(subAccountData),
        isPayStackConnected: true,
      },
    });

    return {
      status: subAccountData.active ? "active" : "pending",
      message: "Pay-stack subaccount created successfully",
      data: subAccountData,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      error.response?.data?.message || "Pay-stack sub-account creation failed"
    );
  }
};

// create checkout session on pay-stack
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

  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

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

  // amount (convert USD → cents)
  const amount = Math.round(booking.totalPrice * 100);

  // add 5% vat
  const vatPercentage = 5;
  const vatAmount = Math.round(amount * (vatPercentage / 100));

  // total amount with 5% vat
  const totalWithVAT = amount + vatAmount;

  // 15% admin commission
  const adminCommissionPercentage = 15;
  const adminCommission = Math.round(
    amount * (adminCommissionPercentage / 100)
  );

  // total admin earnings
  const adminFee = adminCommission + vatAmount;

  // service fee (partner earnings)
  const serviceFee = totalWithVAT - adminFee;

  // --- Initialize Pay-stack transaction ---
  const response = await axios.post(
    `${payStackBaseUrl}/transaction/initialize`,
    {
      email: user.email,
      amount,
      subaccount: partner.payStackSubAccountId,
      metadata: {
        bookingId,
        serviceType,
        userId,
        partnerId,
        description,
        adminFee,
        serviceFee,
      },
      callback_url: `${callback_url}/payment/success`,
    },
    {
      headers,
    }
  );

  const data = response.data.data;
  // console.log(data);

  // --- Save payment record in DB ---
  await prisma.payment.create({
    data: {
      amount: totalWithVAT,
      description,
      currency: "NGN",
      sessionId: data.reference,
      paymentMethod: "card",
      status: PaymentStatus.UNPAID,
      provider: "PAYSTACK",
      payable_name: partner.fullName ?? "",
      payable_email: partner.email,
      country: partner.country ?? "",
      admin_commission: adminCommission, // 15%
      vat_amount: vatAmount, // 5%
      service_fee: serviceFee, // partner earning
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

// charge card (in-app payment)
const chargeCardPayStack = async (payload: any) => {
  console.log(payload, "payload");
  const [expiryMonth, expiryYear] = payload.expiry.split("/");

  const response = await axios.post(
    `${payStackBaseUrl}/transaction/charge`,
    {
      reference: payload.reference,
      email: payload?.card?.email,
      amount: payload.amount,
      card: {
        number: payload.number,
        cvv: payload.cvc,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        pin: payload.pin || undefined,
      },
    },
    { headers }
  );

  const data = response.data.data;
  console.log(response, "response");
  console.log(response.data.data, "response.data.data");
  console.log(data, "data");

  await prisma.payment.update({
    where: { sessionId: payload.reference },
    data: {
      status:
        data.status === "success" ? PaymentStatus.PAID : PaymentStatus.UNPAID,
      metadata: data,
    },
  });

  return { success: data.status === "success", data };
};

// handle pay-stack webhook
const payStackHandleWebhook = async (req: any) => {
  try {
    const signature = req.headers["x-paystack-signature"];

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString()
      : JSON.stringify(req.body);

    // verify pay-stack signature
    const hash = crypto
      .createHmac("sha512", config.payStack.secretKey as string)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid webhook signature");
    }

    // parse raw body
    const event = JSON.parse(rawBody);
    // console.log("received Pay-stack Event:", event);

    if (event.event !== "charge.success") {
      return { received: true }; // ignore other events
    }

    const reference = event.data.reference;
    // console.log("event.data.reference:", event.data.reference);

    // find payment
    const payment = await prisma.payment.findFirst({
      where: { sessionId: reference },
    });
    // console.log("payment:", payment);

    if (!payment) {
      // console.log("Payment not found for reference:", reference);
      return { received: true };
    }

    // update payment → PAID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        transactionId: String(event.data.id),
        admin_commission: event.data.fees_split?.integration ?? 0,
        service_fee: event.data.fees_split?.subaccount ?? 0,
        paystack_fee: event.data.fees_split?.paystack ?? 0,
        metadata: event.data,
      },
    });

    // update booking + service
    const configs = serviceConfig[payment.serviceType as ServiceType];
    if (!config) {
      // console.log("Service config not found:", payment.serviceType);
      return { received: true };
    }

    const bookingId = (payment as any)[configs.serviceTypeField];
    const booking = await configs.bookingModel.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      // console.log("Booking not found:", bookingId);
      return { received: true };
    }

    // booking → CONFIRMED
    await configs.bookingModel.update({
      where: { id: booking.id },
      data: { bookingStatus: BookingStatus.CONFIRMED },
    });

    // service → BOOKED
    const serviceId = (booking as any)[
      `${payment.serviceType.toLowerCase()}Id`
    ];
    if (serviceId) {
      await configs.serviceModel.update({
        where: { id: serviceId },
        data: { isBooked: EveryServiceStatus.BOOKED },
      });
    }

    // SECURITY service → hiredCount++
    if (
      payment.serviceType === "SECURITY" &&
      payment.status === PaymentStatus.PAID
    ) {
      await configs.serviceModel.update({
        where: { id: serviceId },
        data: { hiredCount: { increment: 1 } },
      });
    }

    // send booking notifications
    const service = await configs.serviceModel.findUnique({
      where: { id: serviceId },
    });
    if (service) {
      await BookingNotificationService.sendBookingNotifications({
        bookingId: booking.id,
        userId: booking.userId,
        partnerId: booking.partnerId,
        serviceTypes: payment.serviceType as ServiceTypes,
        serviceName: service[configs.nameField],
        totalPrice: booking.totalPrice,
      });
    }

    return { received: true };
  } catch (error) {
    console.error("Error handling Pay-stack webhook:", error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Webhook handling failed"
    );
  }
};

// cancel booking service pay-stack
const cancelPayStackBooking = async (
  serviceType: string,
  bookingId: string,
  userId: string
) => {
  const bookingModelMap: Record<string, any> = {
    car: prisma.car_Booking,
    hotel: prisma.hotel_Booking,
    security: prisma.security_Booking,
    attraction: prisma.attraction_Booking,
  };

  const serviceModelMap: Record<string, any> = {
    car: prisma.car,
    hotel: prisma.hotel,
    security: prisma.security_Guard,
    attraction: prisma.appeal,
  };

  const bookingModel = bookingModelMap[serviceType.toLowerCase()];
  const serviceModel = serviceModelMap[serviceType.toLowerCase()];

  if (!bookingModel || !serviceModel) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid service type");
  }

  // Booking with payment + user
  const booking = await bookingModel.findFirst({
    where: {
      id: bookingId,
      userId,
      bookingStatus: BookingStatus.CONFIRMED, // or any other status
    },
    include: { payment: true, user: true },
  });

  if (!booking) throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");

  // const payment = booking.payment
  //   ?.filter((p:any) => p.provider === "PAYSTACK" && p.status === "PAID" && p.transactionId)
  //   .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const payment = booking.payment
    ?.filter(
      (p: any) =>
        p.provider === "PAYSTACK" && p.status === "PAID" && p.transactionId
    )
    .pop();

  if (!payment || !payment.transactionId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No payment found for this booking"
    );
  }

  // Find the partner (service provider)
  const partner = await prisma.user.findUnique({
    where: { id: payment.partnerId },
  });

  if (!partner || !partner.payStackSubAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Partner has no connected Paystack account"
    );
  }

  // -------- Refund API call (Paystack) --------
  await axios.post(
    `${payStackBaseUrl}/refund`,
    { transaction: payment.transactionId },
    { headers: { Authorization: `Bearer ${config.payStack.secretKey}` } }
  );

  // -------- Update DB --------
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.REFUNDED },
  });

  await bookingModel.update({
    where: { id: bookingId },
    data: { bookingStatus: BookingStatus.CANCELLED },
  });

  const serviceIdField = `${serviceType.toLowerCase()}Id`;
  await serviceModel.update({
    where: { id: booking[serviceIdField] },
    data: { isBooked: EveryServiceStatus.AVAILABLE },
  });

  // -------- Send Cancel Notification --------
  const service = await serviceModel.findUnique({
    where: { id: booking[serviceIdField] },
  });

  const notificationData: IBookingNotificationData = {
    bookingId: booking.id,
    userId: booking.userId,
    partnerId: booking.partnerId,
    serviceTypes: serviceType.toUpperCase() as ServiceTypes,
    serviceName: service?.name || "",
    totalPrice: booking.totalPrice,
  };

  await BookingNotificationService.sendCancelNotifications(notificationData);

  return { bookingId, status: "CANCELLED" };
};

// get my all my transactions
const getMyTransactions = async (userId: string) => {
  const transactions = await prisma.payment.findMany({
    where: { userId, status: PaymentStatus.PAID },
  });

  if (!transactions || transactions.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No transactions found");
  }

  return transactions;
};

// ------------------------------ website payment ------------------------------
// checkout session on stripe
const createStripePaymentIntentWebsite = async (
  userId: string,
  serviceType: string,
  bookingId: string,
  description: string,
  country: string
) => {
  let booking: any;
  let service: any;
  let partner: any;
  let serviceName: string;
  let partnerId: string;
  let totalPrice: number;

  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  // ensure user has an active Stripe account
  // const stripeStatus = await ensureUserStripeAccount(userId);
  // if (stripeStatus.status === "onboarding_required") {
  //   return {
  //     message: "Stripe account onboarding required",
  //     onboardingLink: stripeStatus.onboardingLink,
  //   };
  // }

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

  // amount (convert USD → cents)
  const amount = Math.round(totalPrice * 100);

  // add 5% vat
  const vatPercentage = 5;
  const vatAmount = Math.round(amount * (vatPercentage / 100));

  // total amount with 5% vat
  const totalWithVAT = amount + vatAmount;

  // 15% admin commission
  const adminCommissionPercentage = 15;
  const adminCommission = Math.round(
    amount * (adminCommissionPercentage / 100)
  );

  // total admin earnings
  const adminFee = adminCommission + vatAmount;

  // service fee (partner earnings)
  const serviceFee = totalWithVAT - adminFee;

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
          unit_amount: totalWithVAT,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${config.stripe.checkout_success_url}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.stripe.checkout_cancel_url}`,
    payment_intent_data: {
      application_fee_amount: adminFee, // goes to Admin
      transfer_data: { destination: partner.stripeAccountId }, // goes to Partner
      description,
    },
    metadata: {
      bookingId: booking.id,
      userId,
      serviceType,
    },
  });

  // if (!checkoutSession) throw new ApiError(httpStatus.BAD_REQUEST, "Failed");

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
      amount: totalWithVAT,
      description,
      currency: checkoutSession.currency,
      sessionId: checkoutSession.id,
      paymentMethod: checkoutSession.payment_method_types.join(","),
      status: PaymentStatus.UNPAID,
      provider: "STRIPE",
      payable_name: partner.fullName ?? "",
      payable_email: partner.email,
      country: partner.country ?? "",
      admin_commission: adminFee, // 15%
      service_fee: serviceFee, // partner earning
      vat_amount: vatAmount, // 5% transaction admin account
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

// create checkout session on pay-stack
const createCheckoutSessionPayStackWebsite = async (
  userId: string,
  serviceType: string,
  bookingId: string,
  description: string,
  country: string
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

  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

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
  const adminFee = Math.round(amount * 0.2); // 20% for app
  const providerAmount = amount - adminFee; // 80% for provider

  // --- Initialize Paystack transaction ---
  const response = await axios.post(
    `${payStackBaseUrl}/transaction/initialize`,
    {
      email: user.email,
      amount,
      subaccount: partner.payStackSubAccountId,
      metadata: {
        bookingId,
        serviceType,
        userId,
        partnerId,
        description,
        adminFee,
        providerAmount,
      },
      callback_url: `${config.frontend_url}/payment/success`,
    },
    {
      headers,
    }
  );

  const data = response.data.data;

  // --- Save payment record in DB ---
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

export const PaymentService = {
  stripeAccountOnboarding,
  createStripePaymentIntent,
  stripeHandleWebhook,
  cancelStripeBooking,
  getPayStackBanks,
  getPayStackSubAccounts,
  verifyPayStackAccount,
  payStackAccountSubAccount,
  createCheckoutSessionPayStack,
  chargeCardPayStack,
  payStackHandleWebhook,
  cancelPayStackBooking,
  getMyTransactions,
  createStripePaymentIntentWebsite,
  createCheckoutSessionPayStackWebsite,
};
