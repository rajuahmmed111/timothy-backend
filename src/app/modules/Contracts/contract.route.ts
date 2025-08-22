import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { ContractController } from "./contract.controller";

const router = express.Router();

// get all contracts (bookings)
router.get("/", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),ContractController.getAllContracts);

export const contractRoutes = router;