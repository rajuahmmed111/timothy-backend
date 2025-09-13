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
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER),
  UserController.getAllAdmins
);

// get all business partners
router.get(
  "/business-partners",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getAllBusinessPartners
);

// get all needed approved partners
router.get(
  "/approved-partners",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getAllNeededApprovedPartners
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
router.get(
  "/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.USER,
    UserRole.BUSINESS_PARTNER
  ),
  UserController.getUserById
);

// get user only partner
router.get(
  "/inactive-partner/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.USER,
    UserRole.BUSINESS_PARTNER
  ),
  UserController.getPartnerById
);

// create user
router.post(
  "/",
  validateRequest(userValidation.createUserZodSchema),
  UserController.createUser
);

// verify user
router.post("/verify-user", UserController.verifyOtpAndCreateUser);

// update partner status (inactive to active)
router.patch(
  "/update-partner-status-active/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.updatePartnerStatusInActiveToActive
);

// update partner status rejected
router.patch(
  "/update-partner-status-reject/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.updatePartnerStatusRejected
);

// update admin status (inactive to active)
router.patch(
  "/update-admin-status-active/:id",
  auth(UserRole.SUPER_ADMIN),
  UserController.updateAdminStatusInActiveToActive
);

// update admin status rejected
router.patch(
  "/update-admin-status-reject/:id",
  auth(UserRole.SUPER_ADMIN),
  UserController.updateAdminStatusRejected
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

// delete my account
router.patch(
  "/my-account",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  UserController.deleteMyAccount
);

// delete user
router.delete(
  "/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  UserController.deleteUser
);

export const userRoute = router;
