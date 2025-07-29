import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { userValidation } from "./user.validation";
import auth from "../../middlewares/auth";
import { uploadFile } from "../../../helpars/fileUploader";
import { UserController } from "./user.controller";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all users
router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getAllUsers
);

// get all admins
router.get(
  "/admins",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getAllAdmins
);

// get all business partners
router.get(
  "/business-partners",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getAllBusinessPartners
);

//get my profile
router.get(
  "/my-profile",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  UserController.getMyProfile
);

// get user by id
router.get("/:id", UserController.getUserById);

// create user
router.post(
  "/",
  validateRequest(userValidation.createUserZodSchema),
  UserController.createUser
);

// update user
router.patch(
  "/update",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  validateRequest(userValidation.updateUserZodSchema),
  UserController.updateUser
);

// update user profile image
router.patch(
  "/profile-img-update",
   auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  uploadFile.profileImage,
  UserController.updateUserProfileImage
);

// delete user
router.delete("/:id", auth(UserRole.SUPER_ADMIN, UserRole.ADMIN), UserController.deleteUser);

export const userRoute = router;
