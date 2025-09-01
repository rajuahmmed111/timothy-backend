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

export const paymentRoutes = router;
