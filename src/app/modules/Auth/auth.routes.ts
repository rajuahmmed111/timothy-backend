import { UserRole } from "@prisma/client";
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router = express.Router();

// login user
router.post("/login", AuthController.loginUser);

// refresh token
router.post("/    ", AuthController.refreshToken);

// user logout route
router.post("/logout", AuthController.logoutUser);

//change password
router.put(
  "/change-password",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER),
  validateRequest(authValidation.changePasswordValidationSchema),
  AuthController.changePassword
);

// forgot password
router.post("/forgot-password", AuthController.forgotPassword);

// reset password
router.post("/reset-password", AuthController.resetPassword);

export const authRoutes = router;
