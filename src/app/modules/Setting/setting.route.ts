import express from "express";
import { SettingController } from "./setting.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// verify email and phone number
router.put(
  "/verify",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  SettingController.verifyEmailAndPhoneNumber
);

// get about App
router.get(
  "/about",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  SettingController.getAbout
);

//  create app about
router.post(
  "/about",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  SettingController.createOrUpdateAbout
);

export const settingRoute = router;
