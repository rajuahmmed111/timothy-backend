import * as bcrypt from "bcrypt";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { Prisma, User, UserRole, UserStatus } from "@prisma/client";
import { ObjectId } from "mongodb";
import { IPaginationOptions } from "../../../interfaces/paginations";
import {
  IFilterRequest,
  IProfileImageResponse,
  IUpdateUser,
  SafeUser,
} from "./user.interface";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { searchableFields } from "./user.constant";
import { IGenericResponse } from "../../../interfaces/common";
import { IUploadedFile } from "../../../interfaces/file";
import { uploadFile } from "../../../helpars/fileUploader";
import { Request } from "express";
import { getDateRange } from "../../../helpars/filterByDate";
import emailSender from "../../../helpars/emailSender";
import { createOtpEmailTemplate } from "../../../utils/createOtpEmailTemplate";

// create user
const createUser = async (payload: any) => {
  // check if email exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User already exists");
  }

  // hash password
  const hashedPassword = await bcrypt.hash(payload.password, 12);

  // create user with inactive status
  const user = await prisma.user.create({
    data: {
      ...payload,
      password: hashedPassword,
      status: UserStatus.INACTIVE,
    },
  });

  // generate OTP
  const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
  // 5 minutes
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

  // prepare email html
  const html = createOtpEmailTemplate(randomOtp);

  // send email
  await emailSender("OTP Verification", user.email, html);

  // update user with OTP + expiry
  await prisma.user.update({
    where: { id: user.id },
    data: { otp: randomOtp, otpExpiry },
  });

  return {
    message: "OTP sent to your email",
    email: user.email,
  };
};

// verify otp and create user
const verifyOtpAndCreateUser = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.otp !== otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  // OTP expired check
  if (!user.otpExpiry || user.otpExpiry < new Date()) {
    // delete user if expired
    await prisma.user.delete({ where: { id: user.id } });
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "OTP has expired, please register again"
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      status: UserStatus.ACTIVE,
      otp: null,
      otpExpiry: null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

// get all users
const getAllUsers = async (
  params: IFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<SafeUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.UserWhereInput[] = [];

  // Filter for active users and role USER only
  filters.push({
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  });

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  const where: Prisma.UserWhereInput = { AND: filters };

  const result = await prisma.user.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.user.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// get all admins
const getAllAdmins = async (
  params: IFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<SafeUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.UserWhereInput[] = [];

  // Filter for active users and role ADMIN only
  filters.push({
    role: UserRole.ADMIN,
  });

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const where: Prisma.UserWhereInput = { AND: filters };

  const result = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN,
    },
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.user.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// update admin status (inactive to active)
const updateAdminStatusInActiveToActive = async (id: string) => {
  // find admin
  const admin = await prisma.user.findUnique({
    where: { id, status: UserStatus.INACTIVE },
  });
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

// update admin status rejected
const updateAdminStatusRejected = async (id: string) => {
  // find admin
  const admin = await prisma.user.findUnique({
    where: { id, status: UserStatus.INACTIVE },
  });
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      status: UserStatus.REJECTED,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

// get all business partners
const getAllBusinessPartners = async (
  params: IFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<SafeUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.UserWhereInput[] = [];

  // Filter for active users and role BUSINESS_PARTNER only
  filters.push({
    role: UserRole.BUSINESS_PARTNER,
    status: UserStatus.ACTIVE,
  });

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  const where: Prisma.UserWhereInput = { AND: filters };

  const result = await prisma.user.findMany({
    where: {
      role: UserRole.BUSINESS_PARTNER,
      status: UserStatus.ACTIVE,
    },
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.user.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// get all needed approved partners
const getAllNeededApprovedPartners = async (
  params: IFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<SafeUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.UserWhereInput[] = [];

  // Filter for inactive users and role BUSINESS_PARTNER only
  filters.push({
    role: UserRole.BUSINESS_PARTNER,
    status: UserStatus.INACTIVE,
  });

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  const where: Prisma.UserWhereInput = { AND: filters };

  const result = await prisma.user.findMany({
    where: {
      role: UserRole.BUSINESS_PARTNER,
      status: UserStatus.INACTIVE,
    },
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.user.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// update partner status (inactive to active)
const updatePartnerStatusInActiveToActive = async (id: string) => {
  // find partner
  const partner = await prisma.user.findUnique({
    where: { id, status: UserStatus.INACTIVE },
  });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const result = await prisma.user.update({
    where: { id },
    data: {
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

// update partner status rejected
const updatePartnerStatusRejected = async (id: string) => {
  // find partner
  const partner = await prisma.user.findUnique({
    where: { id, status: UserStatus.INACTIVE },
  });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const result = await prisma.user.update({
    where: { id },
    data: {
      status: UserStatus.REJECTED,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

// get user by id
const getUserById = async (id: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id, status: UserStatus.ACTIVE },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

// get user by only partner
const getPartnerById = async (id: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id, role: UserRole.BUSINESS_PARTNER },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

// update user
const updateUser = async (
  id: string,
  updates: IUpdateUser
): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id, status: UserStatus.ACTIVE },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // update fields
  const allowedFields: Partial<IUpdateUser> = {
    fullName: updates.fullName,
    email: updates.email,
    contactNumber: updates.contactNumber,
    address: updates.address,
    country: updates.country,
  };

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: allowedFields,
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

// get my profile
const getMyProfile = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: { id, status: UserStatus.ACTIVE },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

// update user profile image
const updateUserProfileImage = async (
  id: string,
  req: Request
): Promise<IProfileImageResponse> => {
  console.log(req.file, "req.file in user service");
  const userInfo = await prisma.user.findUnique({
    where: { id, status: UserStatus.ACTIVE },
  });
  if (!userInfo) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const file = req.file as IUploadedFile;
  if (file) {
    const cloudinaryResponse = await uploadFile.uploadToCloudinary(file);
    req.body.profilePhoto = cloudinaryResponse?.secure_url;
  }

  const profileInfo = await prisma.user.update({
    where: {
      email: userInfo.email,
    },
    data: { profileImage: req.body.profilePhoto },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
    },
  });
  return profileInfo;
};

// delete my account
const deleteMyAccount = async (userId: string) => {
  const result = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });

  if (!result) {
    throw new Error("User not found");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.INACTIVE },
  });
};

// delete user
const deleteUser = async (
  userId: string,
  loggedId: string
): Promise<User | void> => {
  if (!ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  if (userId === loggedId) {
    throw new ApiError(403, "You can't delete your own account!");
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  // Delete the user
  await prisma.user.update({
    where: { id: userId, status: UserStatus.ACTIVE },
    data: { status: UserStatus.INACTIVE },
  });

  return;
};

export const UserService = {
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
