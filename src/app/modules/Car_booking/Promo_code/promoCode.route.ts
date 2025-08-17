import express from "express";
import { PromoCodeController } from "./promoCode.controller";
import auth from "../../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create promo code only for admin
router.post(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  PromoCodeController.createPromoCode
);

export const promoCodeRoute = router;
