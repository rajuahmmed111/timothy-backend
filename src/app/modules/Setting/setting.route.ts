import express from "express";
import { SettingController } from "./setting.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();



// verify email and phone number
router.put("/verify", auth(UserRole.USER, UserRole.BUSINESS_PARTNER), SettingController.verifyEmailAndPhoneNumber);

// app about
// router.post("/about", auth(UserRole.SUPER_ADMIN, UserRole.ADMIN), SettingController.updateAppAbout);

export const settingRoute = router;