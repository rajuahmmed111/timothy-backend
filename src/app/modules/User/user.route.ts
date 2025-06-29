import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { userValidation } from "./user.validation";
import auth from "../../middlewares/auth";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import { uploadFile } from "../../../helpars/fileUploader";
import { UserController } from "./user.controller";

// import { parseBodyData } from '../../middlewares/parseBodyData';

const router = express.Router();

// get all users
router.get("/", UserController.getAllUsers);

// get user by id
router.get("/:id", UserController.getUserById);

//get my profile
router.get("/my-profile", auth(), UserController.getMyProfile);

// create user
router.post(
  "/",
  validateRequest(userValidation.createUserZodSchema),
  UserController.createUser
);

// update user
router.patch(
  "/update",
  auth(),
  validateRequest(userValidation.updateUserZodSchema),
  UserController.updateUser
);

// update user profile image
router.patch(
  "/profile-img-update",
  auth(),
  uploadFile.profileImage,
  UserController.updateUserProfileImage
);

// delete user
router.delete("/:id", UserController.deleteUser);

export const userRoute = router;
