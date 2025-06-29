import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { UserService } from "./user.service";
import ApiError from "../../../errors/ApiErrors";
import { pick } from "../../../shared/pick";
import { filterField } from "./user.constant";
import { paginationFields } from "../../../constants/pagination";

// create user
const createUser = catchAsync(async (req: Request, res: Response) => {
  const userData = req.body;
  const result = await UserService.createUser(userData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User information created successfully",
    data: result,
  });
});

// get all users
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await UserService.getAllUsers(filter, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully",
    data: result,
  });
});

// get user by id
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await UserService.getUserById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data: { ...user, password: undefined },
  });
});


// update user
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const data = req.body;

  const result = await UserService.updateUser(userId, data);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User information updated successfully",
    data: result,
  });
});

// delete user
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const loggedId = req.user.id;

  await UserService.deleteUser(userId, loggedId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User deleted successfully",
    data: undefined,
  });
});


// update my  profile image
const updateUserProfileImage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const result = await UserService.updateUserProfileImage(id, req);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "My profile image updated successfully",
    data: result,
  });
});

// get my profile
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const result = await UserService.getMyProfile(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "My profile retrieved successfully",
    data: result,
  });
});

export const UserController = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserProfileImage,
  getMyProfile,
};

 
