import express from "express";
import { FinanceController } from "./finance.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all finances
router.get(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  FinanceController.getAllFinances
);

// get all service providers finances
router.get(
  "/provider/:partnerId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  FinanceController.getAllProvidersFinances
);

// get all users finance
router.get(
  "/user/:userId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  FinanceController.getAllUsersFinances
);

// get single service provider finances
router.get(
  "/:paymentId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  FinanceController.getSingleProviderFinance
);

export const financeRoutes = router;
