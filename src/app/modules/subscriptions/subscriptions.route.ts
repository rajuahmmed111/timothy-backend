import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { subscriptionController } from "./subscriptions.controller";

const router = express.Router();

// stripe account onboarding
router.post(
  "/create-stripe-account",
  auth(UserRole.USER),
  subscriptionController.createStripeAccount
);

//create plan
router.post(
  "/create-plan",
  // Only admins can create plans
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  subscriptionController.createSubscriptionPlan
);

// subscription got as user
router.post(
  "/create",
  auth(UserRole.USER),
  subscriptionController.createSubscription
);

// checkout session
router.post(
  "/checkout",
  auth(UserRole.USER),
  subscriptionController.checkoutSession
);

router.post(
  "/cancel",
  auth(UserRole.USER),
  subscriptionController.cancelSubscription
);

router.post(
  "/update-plan",
  auth(UserRole.USER),
  subscriptionController.updateSubscriptionPlan
);

// Payment provider webhooks
// Note: These don't need auth as they are called by payment providers
router.post(
  "/webhooks",
  express.raw({ type: "application/json" }), // important: keep raw body
  subscriptionController.handleStripeWebhook
);

export const subscriptionRoute = router;
// cloudflared tunnel --url http://localhost:5000