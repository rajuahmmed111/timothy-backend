import express from "express";
import { SettingController } from "./setting.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// delete my account
router.delete("/my-account", auth(UserRole.USER, UserRole.BUSINESS_PARTNER), SettingController.deleteMyAccount);

// verify email and phone number
router.put("/verify", auth(UserRole.USER, UserRole.BUSINESS_PARTNER), SettingController.verifyEmailAndPhoneNumber);

export const settingRoute = router;