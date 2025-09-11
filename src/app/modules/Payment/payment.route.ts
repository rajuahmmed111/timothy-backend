import express from "express";
import { PaymentController } from "./payment.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// ------------------------------stripe routes-----------------------------
// stripe account onboarding
router.post(
  "/stripe-account-onboarding",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  PaymentController.stripeAccountOnboarding
);

// checkout session on stripe
router.post(
  "/create-checkout-session/:serviceType/:bookingId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  PaymentController.createCheckoutSession
);

// stripe webhook payment
router.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }), // important: keep raw body
  PaymentController.stripeHandleWebhook
);

// cancel booking stripe
router.post(
  "/stripe-cancel-booking/:serviceType/:bookingId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  PaymentController.cancelStripeBooking
);

// ------------------------------pay-stack routes-----------------------------
// get banks list
router.get("/paystack-banks", PaymentController.getPayStackBanks);

// get sub account list
router.get("/paystack-sub-accounts", PaymentController.getPayStackSubAccounts);

// verify account
router.post(
  "/paystack-verify-account",
  PaymentController.verifyPayStackAccount
);

// get my

// pay-stack account sub-account
router.post(
  "/paystack-account-sub-account",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  PaymentController.payStackAccountSubAccount
);

// create checkout session on pay-stack
router.post(
  "/create-checkout-session-paystack/:serviceType/:bookingId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  PaymentController.createCheckoutSessionPayStack
);

// pay-stack webhook payment
router.post(
  "/paystack-webhook",
  express.raw({ type: "application/json" }), // important: keep raw body
  PaymentController.payStackHandleWebhook
);

// pay-stack cancel booking
router.post(
  "/paystack-cancel-booking/:serviceType/:bookingId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  PaymentController.cancelPayStackBooking
);

export const paymentRoutes = router;
