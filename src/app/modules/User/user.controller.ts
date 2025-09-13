import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { UserService } from "./user.service";
import ApiError from "../../../errors/ApiErrors";
import { pick } from "../../../shared/pick";
import { filterField } from "./user.constant";
import { paginationFields } from "../../../constants/pagination";
import { isValidObjectId } from "../../../utils/validateObjectId";

// create user
const createUser = catchAsync(async (req: Request, res: Response) => {
  const userData = req.body;
  const result = await UserService.createUser(userData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "OTP generated and sent to email successfully",
    data: result,
  });
});

// verify user
const verifyOtpAndCreateUser = catchAsync(
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await UserService.verifyOtpAndCreateUser(email, otp);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User verified successfully",
      data: result,
    });
  }
);

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

// get all admins
const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await UserService.getAllAdmins(filter, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admins fetched successfully",
    data: result,
  });
});

// update admin status (inactive to active)
const updateAdminStatusInActiveToActive = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await UserService.updateAdminStatusInActiveToActive(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin status updated successfully",
      data: result,
    });
  }
);

// update admin status rejected
const updateAdminStatusRejected = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await UserService.updateAdminStatusRejected(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin status updated successfully",
      data: result,
    });
  }
);

// get all business partners
const getAllBusinessPartners = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await UserService.getAllBusinessPartners(filter, options);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Business Partners fetched successfully",
      data: result,
    });
  }
);

// get all needed approved partners
const getAllNeededApprovedPartners = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await UserService.getAllNeededApprovedPartners(
      filter,
      options
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Business Partners fetched successfully",
      data: result,
    });
  }
);

// update partner status (inactive to active)
const updatePartnerStatusInActiveToActive = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.updatePartnerStatusInActiveToActive(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Partner status updated successfully",
      data: result,
    });
  }
);

// update partner status rejected
const updatePartnerStatusRejected = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.updatePartnerStatusRejected(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Partner status updated successfully",
      data: result,
    });
  }
);

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

// get user by only partner
const getPartnerById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await UserService.getPartnerById(id);

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

// update my  profile image
const updateUserProfileImage = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const result = await UserService.updateUserProfileImage(id, req);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "My profile image updated successfully",
      data: result,
    });
  }
);

// delete my account
const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await UserService.deleteMyAccount(userId);

  // clear the token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My account deleted successfully",
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

export const UserController = {
  createUser,
  verifyOtpAndCreateUser,
  getAllUsers,
  getAllAdmins,
  updateAdminStatusInActiveToActive,
  updateAdminStatusRejected,
  getAllBusinessPartners,
  getAllNeededApprovedPartners,
  updatePartnerStatusInActiveToActive,
  updatePartnerStatusRejected,
  getUserById,
  updateUser,
  getMyProfile,
  updateUserProfileImage,
  deleteMyAccount,
  deleteUser,
  getPartnerById,
};
