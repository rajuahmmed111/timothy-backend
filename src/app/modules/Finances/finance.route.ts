import express from "express";
import { FinanceController } from "./finance.controller";

const router = express.Router();

// get all service providers finances
router.get("/", FinanceController.getAllProvidersFinances);

export const financeRoutes = router;