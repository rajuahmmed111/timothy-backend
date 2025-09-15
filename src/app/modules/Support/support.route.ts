import express from "express";
import { SupportController } from "./support.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all support
router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  SupportController.getAllSupport
);

// create support
router.post(
  "/",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  SupportController.createSupport
);

export const supportRoutes = router;
