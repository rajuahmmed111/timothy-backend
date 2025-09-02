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

// checkout session
router.post(
    "/create-checkout-session",
    auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
    PaymentController.createCheckoutSession
);

export const paymentRoutes = router;
