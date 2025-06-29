import * as bcrypt from "bcrypt";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { Prisma, User, UserRole, UserStatus } from "@prisma/client";
import { ObjectId } from "mongodb";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { IFilterRequest, IProfileImageResponse, IUpdateUser, SafeUser } from "./user.interface";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { searchableFields } from "./user.constant";
import { IGenericResponse } from "../../../interfaces/common";
import { IUploadedFile } from "../../../interfaces/file";
import { uploadFile } from "../../../helpars/fileUploader";
import { Request } from "express";

// create user
const createUser = async (payload: any): Promise<SafeUser | null> => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email, status: UserStatus.ACTIVE },
  });
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  if (!hashedPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to hash password");
  }

  const user = await prisma.user.create({
    data: {
      ...payload,
      password: hashedPassword,
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
      plan: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

// get all users
const getAllUsers = async (
  params: IFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<SafeUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

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
      status: true,
      plan: true,
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
      status: true,
      plan: true,
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

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...updates,
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
      plan: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
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
  await prisma.user.delete({
    where: { id: userId },
  });

  return;
};

// update user profile image
const updateUserProfileImage = async (id: string, req: Request): Promise<IProfileImageResponse> => {
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

// get my profile
const getMyProfile = async (id: string): Promise<IProfileImageResponse> => {
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
      status: true,
      plan: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

export const UserService = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserProfileImage,
  getMyProfile,
};
