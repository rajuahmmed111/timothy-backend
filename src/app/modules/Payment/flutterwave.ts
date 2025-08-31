// services/flutterwave.service.ts
import axios from "axios";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import {
  IFlutterwavePaymentData,
  IFlutterwaveSubAccountData,
} from "./payment.interface";
import prisma from "../../../shared/prisma";
import config from "../../../config";
import crypto from "crypto";

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
const FW_SECRET_KEY = config.flutterwave.secretKey;

const flutterwaveAxios = axios.create({
  baseURL: FLUTTERWAVE_BASE_URL,
  headers: {
    Authorization: `${FW_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

// initialize payment
const initializePayment = async (paymentData: IFlutterwavePaymentData) => {
  try {
    const response = await flutterwaveAxios.post("/payments", paymentData);
    return response.data;
  } catch (error: any) {
    console.error(
      "Flutterwave payment initialization error:",
      error.response?.data
    );
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      error.response?.data?.message || "Failed to initialize payment"
    );
  }
};

// verify payment
const verifyPayment = async (transactionId: string) => {
  try {
    const response = await flutterwaveAxios.get(
      `/transactions/${transactionId}/verify`
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Flutterwave payment verification error:",
      error.response?.data
    );
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      error.response?.data?.message || "Failed to verify payment"
    );
  }
};

// create sub-account
const createSubAccount = async (subAccountData: IFlutterwaveSubAccountData) => {
  try {
    const response = await flutterwaveAxios.post(
      "/subaccounts",
      subAccountData
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Flutterwave sub-account creation error:",
      error.response?.data
    );
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      error.response?.data?.message || "Failed to create sub-account"
    );
  }
};

// get sub-account status
const getSubAccountStatus = async (subAccountId: string) => {
  try {
    const response = await flutterwaveAxios.get(`/subaccounts/${subAccountId}`);
    return response.data;
  } catch (error: any) {
    console.error(
      "Flutterwave sub-account status error:",
      error.response?.data
    );
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      error.response?.data?.message || "Failed to get sub-account status"
    );
  }
};

// generate onboarding link
const generateOnboardingLink = async (
  userId: string,
  email: string,
  fullName: string
) => {
  // This would typically generate a custom onboarding link
  // For now, returning a placeholder link where they can create sub-account
  // const baseUrl ="https://timothy-dashboard.netlify.app";
  return `${FLUTTERWAVE_BASE_URL}/onboarding/flutterwave?userId=${userId}&email=${encodeURIComponent(
    email
  )}&name=${encodeURIComponent(fullName)}`;
};

// verify webhook signature for security
const verifyWebhookSignature = async (webhookData: any, signature: string) => {
  const FW_WEBHOOK_HASH = config.flutterwave.webhookKey;

  if (!FW_WEBHOOK_HASH) {
    console.error("FLUTTERWAVE_WEBHOOK_HASH not set in environment variables");
    return false;
  }

  // create hash using the webhook data and secret
  const hash = crypto
    .createHmac("sha256", FW_WEBHOOK_HASH)
    .update(JSON.stringify(webhookData))
    .digest("hex");

  return hash === signature;
};

export const FlutterwaveService = {
  initializePayment,
  verifyPayment,
  createSubAccount,
  getSubAccountStatus,
  generateOnboardingLink,
  verifyWebhookSignature,
};

// ==================== NOTIFICATION SERVICE ====================

const sendOnboardingNotification = async (
  userId: string,
  onboardingLink: string
) => {
  await prisma.notifications.create({
    data: {
      receiverId: userId,
      title: "Complete Flutterwave Onboarding",
      message: `Please complete your Flutterwave account setup to receive payments. Click the link: ${onboardingLink}`,
      body: `Onboarding required for payments`,
      serviceType: "ONBOARDING",
      read: false,
      isClicked: false,
    },
  });
};

const sendPaymentSuccessNotification = async (
  userId: string,
  partnerId: string,
  bookingId: string
) => {
  // Notification to customer
  await prisma.notifications.create({
    data: {
      receiverId: userId,
      title: "Payment Successful",
      message: `You received a payment of successfully.`,
      body: `Payment successful for booking ${bookingId}`,
      serviceType: "PAYMENT_SUCCESS",
      read: false,
      isClicked: false,
    },
  });

  // Notification to service provider
  await prisma.notifications.create({
    data: {
      receiverId: partnerId,
      title: "Payment Received",
      message: `You received a payment of successfully.`,
      body: `Payment received for booking ${bookingId}`,
      serviceType: "PAYMENT_RECEIVED",
      read: false,
      isClicked: false,
    },
  });
};

const sendPaymentFailureNotification = async (
  userId: string,
  bookingId: string
) => {
  await prisma.notifications.create({
    data: {
      receiverId: userId,
      title: "Payment Failed",
      message: `Your payment for booking ${bookingId} failed. Please try again.`,
      body: `Payment failed for booking ${bookingId}`,
      serviceType: "PAYMENT_FAILED",
      read: false,
      isClicked: false,
    },
  });
};

const sendBookingConfirmationNotification = async (
  userId: string,
  partnerId: string,
  bookingData: any
) => {
  // Implementation for booking confirmation notifications
  // Similar to existing notification patterns
};

const sendSubAccountCreationNotification = async (
  userId: string,
  subAccountId: string
) => {
  await prisma.notifications.create({
    data: {
      receiverId: userId,
      title: "Flutterwave Account Created",
      message: `Your Flutterwave sub-account (${subAccountId}) has been created successfully.`,
      body: `Flutterwave sub-account created`,
      serviceType: "ACCOUNT_CREATED",
      read: false,
      isClicked: false,
    },
  });
};

const sendSubAccountStatusNotification = async (
  userId: string,
  status: string,
  subAccountId: string
) => {
  const message =
    status === "active"
      ? "Your Flutterwave account is now active and ready to receive payments."
      : "Your Flutterwave account status has been updated.";

  await prisma.notifications.create({
    data: {
      receiverId: userId,
      title: "Account Status Update",
      message: `${message} (${subAccountId})`,
      body: `Flutterwave account status updated`,
      serviceType: "ACCOUNT_STATUS",
      read: false,
      isClicked: false,
    },
  });
};

export const NotificationService = {
  sendOnboardingNotification,
  sendPaymentSuccessNotification,
  sendPaymentFailureNotification,
  sendBookingConfirmationNotification,
  sendSubAccountCreationNotification,
  sendSubAccountStatusNotification,
};
