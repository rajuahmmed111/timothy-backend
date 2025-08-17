import express from "express";
import { PromoCodeController } from "./promoCode.controller";
import auth from "../../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all promo codes
router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER),
  PromoCodeController.getAllPromoCodes
);

// get single promo cod
router.get(
  "/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER),
  PromoCodeController.getPromoCodeById
);

// create promo code only for admin
router.post(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  PromoCodeController.createPromoCode
);

export const promoCodeRoute = router;
