import { BookingStatus, UserStatus } from "@prisma/client";
import config from "../../../config";
import prisma from "../../../shared/prisma";
import {
  IFlutterwavePaymentData,
  IFlutterwaveSubAccountData,
  IPaymentData,
} from "./payment.interface";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { FlutterwaveService } from "./flutterwave";

// initiate payment for car booking
const initiatePayment = async (
  userId: string,
  bookingId: string,
  paymentData: IPaymentData
) => {
  // validate user
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found or inactive");
  }

  // validate booking
  const booking = await prisma.car_Booking.findUnique({
    where: { id: bookingId, userId },
    include: {
      car: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.bookingStatus !== BookingStatus.PENDING) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Booking is not in pending status"
    );
  }

  // if service provider has active Flutterwave sub-account
  const serviceProvider = await prisma.user.findUnique({
    where: { id: booking.partnerId },
  });

  if (!serviceProvider) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service provider not found");
  }

  // if service provider doesn't have active sub-account, initiate onboarding
  if (
    !serviceProvider.isSubAccountActive ||
    !serviceProvider.flutterwaveSubAccountId
  ) {
    const onboardingLink = await FlutterwaveService.generateOnboardingLink(
      serviceProvider.id,
      serviceProvider.email,
      serviceProvider.fullName || "Service Provider"
    );

    // send notification to service provider about onboarding
    // await NotificationService.sendOnboardingNotification(
    //   serviceProvider.id,
    //   onboardingLink
    // );

    return {
      requiresOnboarding: true,
      onboardingLink,
      message:
        "Service provider needs to complete Flutterwave onboarding first",
      serviceProviderEmail: serviceProvider.email,
    };
  }

  // generate unique transaction
  const txRef = `CAR_${bookingId}_${Date.now()}`;

  // Prepare payment data for Flutterwave
  const flutterwavePaymentData: IFlutterwavePaymentData = {
    tx_ref: txRef,
    amount: booking.totalPrice,
    currency: paymentData.currency || "NGN",
    redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
    customer: {
      email: user.email,
      phonenumber: user.contactNumber || "",
      name: user.fullName || "Customer",
    },
    subaccounts: [
      {
        id: serviceProvider.flutterwaveSubAccountId as string,
        transaction_split_ratio: 80, // 80% to service provider
      },
    ],
    customizations: {
      title: "Car Rental Payment",
      description: `Payment for ${booking.car.carName} rental`,
      logo: process.env.APP_LOGO || "",
    },
  };

  // initialize payment with Flutterwave
  const paymentResponse = await FlutterwaveService.initializePayment(
    flutterwavePaymentData
  );

  // update booking
  await prisma.car_Booking.update({
    where: { id: bookingId },
    data: {
      txRef,
      flutterwaveTransactionId: paymentResponse.data.id,
    },
  });

  // create payment record
  await prisma.payment.create({
    data: {
      amount: booking.totalPrice,
      currency: flutterwavePaymentData.currency,
      provider: "FLUTTERWAVE",
      txRef,
      status: "PENDING",
      userId,
      serviceType: "CAR_RENTAL",
      serviceId: bookingId,
    },
  });

  return {
    requiresOnboarding: false,
    paymentLink: paymentResponse.data.link,
    txRef,
    amount: booking.totalPrice,
    currency: flutterwavePaymentData.currency,
  };
};

// handle payment webhook from Flutterwave
const handlePaymentWebhook = async (webhookData: any, signature: string) => {
  // webhook signature
  const isValidSignature = await FlutterwaveService.verifyWebhookSignature(
    webhookData,
    signature
  );

  if (!isValidSignature) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid webhook signature");
  }

  const { event, data } = webhookData;

  // webhook events
  switch (event) {
    case "charge.completed":
      return await processPaymentWebhook(data);

    case "transfer.completed":
      return await processTransferWebhook(data);

    default:
      console.log(`Unhandled webhook event: ${event}`);
      return { status: "ignored", event };
  }
};

// process payment webhook
const processPaymentWebhook = async (paymentData: any) => {
  const { tx_ref, status, id: transaction_id, amount, currency } = paymentData;

  // find booking
  const booking = await prisma.car_Booking.findFirst({
    where: { txRef: tx_ref },
    include: {
      car: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
      user: true,
    },
  });

  if (!booking) {
    console.log(`Booking not found for tx_ref: ${tx_ref}`);
    return { status: "booking_not_found", tx_ref };
  }

  // prevent duplicate processing
  const existingPayment = await prisma.payment.findFirst({
    where: {
      txRef: tx_ref,
      status: "SUCCESS",
    },
  });

  if (existingPayment) {
    console.log(`Payment already processed for tx_ref: ${tx_ref}`);
    return { status: "already_processed", tx_ref };
  }

  if (status === "successful") {
    // update booking status
    await prisma.car_Booking.update({
      where: { id: booking.id },
      data: {
        bookingStatus: BookingStatus.CONFIRMED,
        payoutStatus: "SUCCESS",
      },
    });

    // update payment status
    await prisma.payment.updateMany({
      where: { txRef: tx_ref },
      data: {
        status: "SUCCESS",
        transactionId: transaction_id,
        amount: amount,
        currency: currency,
      },
    });

    // update car availability
    await prisma.car_Rental.update({
      where: { id: booking.carId },
      data: { isBooked: "BOOKED" },
    });

    // send success notifications
    // await NotificationService.sendPaymentSuccessNotification(
    //   booking.userId!,
    //   booking.partnerId,
    //   booking.id,
    //   booking.totalPrice
    // );

    // create payout
    await prisma.payout.create({
      data: {
        amount: amount * 0.8, // 80% to service provider
        currency: currency,
        status: "COMPLETED",
        serviceProviderId: booking.partnerId,
        bookingId: booking.id,
        transactionId: transaction_id,
        serviceType: "CAR_RENTAL",
      },
    });

    // create platform commission
    await prisma.platformCommission.create({
      data: {
        amount: amount * 0.2, // 20% platform commission
        currency: currency,
        bookingId: booking.id,
        transactionId: transaction_id,
        serviceType: "CAR_RENTAL",
      },
    });

    console.log(
      `Payment webhook processed successfully for booking: ${booking.id}`
    );

    return {
      status: "success",
      message: "Payment webhook processed successfully",
      bookingId: booking.id,
      amount: amount,
    };
  } else {
    // failed payment
    await prisma.car_Booking.update({
      where: { id: booking.id },
      data: {
        bookingStatus: BookingStatus.CANCELLED,
        payoutStatus: "FAILED",
      },
    });

    await prisma.payment.updateMany({
      where: { txRef: tx_ref },
      data: {
        status: "FAILED",
        transactionId: transaction_id,
      },
    });

    // send failure notification
    // await NotificationService.sendPaymentFailureNotification(
    //   booking.userId!,
    //   booking.id
    // );

    return {
      status: "failed",
      message: "Payment failed via webhook",
      bookingId: booking.id,
    };
  }
};

// process transfer webhook
const processTransferWebhook = async (transferData: any) => {
  const { reference, status, amount, currency } = transferData;

  // find payout
  const payout = await prisma.payout.findFirst({
    where: { transactionId: reference },
  });

  if (payout) {
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: status === "successful" ? "COMPLETED" : "FAILED",
      },
    });

    // notify service provider about payout status
    // await NotificationService.sendPayoutNotification(
    //   payout.serviceProviderId,
    //   amount,
    //   status
    // );
  }

  return {
    status: "processed",
    message: "Transfer webhook processed",
    reference,
    amount,
  };
};

// handle sub-account webhook
const handleSubAccountWebhook = async (webhookData: any, signature: string) => {
  // webhook signature
  const isValidSignature = await FlutterwaveService.verifyWebhookSignature(
    webhookData,
    signature
  );

  if (!isValidSignature) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid webhook signature");
  }

  const { event, data } = webhookData;

  if (event === "subaccount.activated" || event === "subaccount.deactivated") {
    const { subaccount_id, status } = data;

    // update user's sub-account status
    await prisma.user.updateMany({
      where: { flutterwaveSubAccountId: subaccount_id },
      data: {
        isSubAccountActive: status === "active",
      },
    });

    // find user
    const user = await prisma.user.findFirst({
      where: { flutterwaveSubAccountId: subaccount_id },
    });

    // if (user) {
    //   await NotificationService.sendSubAccountStatusNotification(
    //     user.id,
    //     status,
    //     subaccount_id
    //   );
    // }

    return {
      status: "success",
      message: "Sub-account webhook processed",
      subaccount_id,
      newStatus: status,
    };
  }

  return {
    status: "ignored",
    event,
    message: "Unhandled sub-account webhook event",
  };
};

// handle payment callback from Flutterwave
const handlePaymentCallback = async (callbackData: any) => {
  const { tx_ref, status, transaction_id } = callbackData;

  // Find booking by transaction reference
  const booking = await prisma.car_Booking.findFirst({
    where: { txRef: tx_ref },
    include: {
      car: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
      user: true,
    },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  // Verify payment with Flutterwave
  const verificationResponse = await FlutterwaveService.verifyPayment(
    transaction_id
  );

  if (verificationResponse.status === "success" && status === "successful") {
    // Update booking status
    await prisma.car_Booking.update({
      where: { id: booking.id },
      data: {
        bookingStatus: BookingStatus.CONFIRMED,
        payoutStatus: "SUCCESS",
      },
    });

    // Update payment status
    await prisma.payment.updateMany({
      where: { txRef: tx_ref },
      data: {
        status: "SUCCESS",
        transactionId: transaction_id,
      },
    });

    // update car availability
    await prisma.car_Rental.update({
      where: { id: booking.carId },
      data: { isBooked: "BOOKED" },
    });

    // // send success notifications
    // await NotificationService.sendPaymentSuccessNotification(
    //   booking.userId!,
    //   booking.partnerId,
    //   booking.id,
    //   booking.totalPrice
    // );

    // // send booking confirmation notification
    // await NotificationService.sendBookingConfirmationNotification(
    //   booking.userId!,
    //   booking.partnerId,
    //   {
    //     bookingId: booking.id,
    //     serviceName: booking.car.carName,
    //     serviceType: "CAR_RENTAL",
    //     totalPrice: booking.totalPrice,
    //     bookedFromDate: booking.carBookedFromDate,
    //     bookedToDate: booking.carBookedToDate,
    //   }
    // );

    return {
      status: "success",
      message: "Payment processed successfully",
      booking: {
        id: booking.id,
        status: BookingStatus.CONFIRMED,
        amount: booking.totalPrice,
      },
    };
  } else {
    // Update booking status to failed
    await prisma.car_Booking.update({
      where: { id: booking.id },
      data: {
        bookingStatus: BookingStatus.CANCELLED,
        payoutStatus: "FAILED",
      },
    });

    // Update payment status
    await prisma.payment.updateMany({
      where: { txRef: tx_ref },
      data: {
        status: "FAILED",
        transactionId: transaction_id,
      },
    });

    // send failure notification
    // await NotificationService.sendPaymentFailureNotification(
    //   booking.userId!,
    //   booking.id
    // );

    return {
      status: "failed",
      message: "Payment failed",
      booking: {
        id: booking.id,
        status: BookingStatus.CANCELLED,
      },
    };
  }
};

// get payment status for a booking
const getPaymentStatus = async (bookingId: string) => {
  const booking = await prisma.car_Booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
    },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const payment = await prisma.payment.findFirst({
    where: { serviceId: bookingId, serviceType: "CAR_RENTAL" },
  });

  return {
    bookingId,
    bookingStatus: booking.bookingStatus,
    payoutStatus: booking.payoutStatus,
    totalPrice: booking.totalPrice,
    txRef: booking.txRef,
    payment: payment
      ? {
          status: payment.status,
          amount: payment.amount,
          transactionId: payment.transactionId,
          createdAt: payment.createdAt,
        }
      : null,
  };
};

// create Flutterwave sub-account for service provider
const createSubAccount = async (
  userId: string,
  subAccountData: IFlutterwaveSubAccountData
) => {
  // Validate user is a business partner
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found or inactive");
  }

  // Check if user already has an active sub-account
  if (user.isSubAccountActive && user.flutterwaveSubAccountId) {
    return {
      message: "Sub-account already exists and is active",
      subAccountId: user.flutterwaveSubAccountId,
      isActive: true,
    };
  }

  // Create sub-account with Flutterwave
  const subAccountResponse = await FlutterwaveService.createSubAccount({
    ...subAccountData,
    meta: { userId },
  });

  // Update user with sub-account information
  await prisma.user.update({
    where: { id: userId },
    data: {
      flutterwaveSubAccountId: subAccountResponse.data.subaccount_id,
      bankCode: subAccountData.account_bank,
      accountNumber: subAccountData.account_number,
      isSubAccountActive: subAccountResponse.data.status === "active",
      flutterwaveAccountLink: subAccountResponse.data.settlement_bank,
    },
  });

  // send notification about sub-account creation
  //   await NotificationService.sendSubAccountCreationNotification(
  //     userId,
  //     subAccountResponse.data.subaccount_id
  //   );

  return {
    message: "Sub-account created successfully",
    subAccountId: subAccountResponse.data.subaccount_id,
    status: subAccountResponse.data.status,
    isActive: subAccountResponse.data.status === "active",
  };
};

// get sub-account status for a user
const getSubAccountStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      flutterwaveSubAccountId: true,
      isSubAccountActive: true,
      bankCode: true,
      accountNumber: true,
      flutterwaveAccountLink: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  let flutterwaveStatus = null;
  if (user.flutterwaveSubAccountId) {
    // Get latest status from Flutterwave
    flutterwaveStatus = await FlutterwaveService.getSubAccountStatus(
      user.flutterwaveSubAccountId
    );
  }

  return {
    userId,
    hasSubAccount: !!user.flutterwaveSubAccountId,
    subAccountId: user.flutterwaveSubAccountId,
    isActive: user.isSubAccountActive,
    bankCode: user.bankCode,
    accountNumber: user.accountNumber,
    flutterwaveStatus: flutterwaveStatus?.data || null,
  };
};

// handle sub-account callback from Flutterwave
const handleSubAccountCallback = async (callbackData: any) => {
  const { subaccount_id, status, meta } = callbackData;
  const userId = meta?.userId;

  if (!userId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User ID not found in callback data"
    );
  }

  // Update user's sub-account status
  await prisma.user.update({
    where: { id: userId },
    data: {
      isSubAccountActive: status === "active",
    },
  });

  // send notification about status update
  //   await NotificationService.sendSubAccountStatusNotification(
  //     userId,
  //     status,
  //     subaccount_id
  //   );

  return {
    message: "Sub-account status updated successfully",
    userId,
    subAccountId: subaccount_id,
    status,
    isActive: status === "active",
  };
};

export const PaymentService = {
  initiatePayment,
  handlePaymentWebhook,
  handleSubAccountWebhook,
  handlePaymentCallback,
  getPaymentStatus,
  createSubAccount,
  getSubAccountStatus,
  handleSubAccountCallback,
};
