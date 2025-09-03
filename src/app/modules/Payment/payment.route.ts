import express from "express";
import { PaymentController } from "./payment.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

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

export const paymentRoutes = router;
