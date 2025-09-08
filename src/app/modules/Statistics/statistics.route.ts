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

export const statisticsRoutes = router;
