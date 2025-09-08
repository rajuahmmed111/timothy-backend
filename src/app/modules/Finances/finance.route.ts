import express from "express";
import { FinanceController } from "./finance.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all service providers finances
router.get("/", auth(UserRole.SUPER_ADMIN, UserRole.ADMIN), FinanceController.getAllProvidersFinances);

export const financeRoutes = router;