import express from "express";
import { StatisticsController } from "./statistics.controller";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";

const router = express.Router();

// get overview total user, total partner,total contracts , admin earnings
router.get(
  "/overview",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.getOverview
);

// get payment with user analysis
router.get(
  "/earning",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
//   StatisticsController.paymentWithUserAnalysis
);

export const statisticsRoutes = router;
