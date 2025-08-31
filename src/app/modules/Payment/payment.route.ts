import express from "express";
import { PaymentController } from "./payment.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// payment routes
router.post(
  "/initiate-payment/:bookingId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  PaymentController.initiatePayment
);

router.post("/payment-callback", PaymentController.handlePaymentCallback);

router.get("/payment-status/:bookingId", PaymentController.getPaymentStatus);

// Webhook routes
router.post("/payment-webhook", PaymentController.handlePaymentWebhook);

router.post("/subaccount-webhook", PaymentController.handleSubAccountWebhook);

// Onboarding routes
router.post(
  "/create-subaccount",
  auth(UserRole.BUSINESS_PARTNER),
  PaymentController.createSubAccount
);

router.get(
  "/subaccount-status/:userId",
  auth(UserRole.BUSINESS_PARTNER, UserRole.ADMIN),
  PaymentController.getSubAccountStatus
);

router.post("/subaccount-callback", PaymentController.handleSubAccountCallback);

export const paymentRoutes = router;
