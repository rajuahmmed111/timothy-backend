import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { UserStatus } from "@prisma/client";

// create support
const createSupport = async (userId: string, data: any) => {
  const { subject, description, supportType } = data;
  if (!subject || !description || !supportType) {
    throw new ApiError(httpStatus.BAD_REQUEST, "fields are required");
  }

  // find user
  const findUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  const result = await prisma.support.create({
    data: {
      userId,
      ...data,
    },
  });
  return result;
};

// get all support
const getAllSupport = async () => {
  const result = await prisma.support.findMany();
  return result;
};

// get my support
const getMySupport = async (userId: string) => {
  // find user
  const findUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.support.findMany({ where: { userId } });
  return result;
};

// get support by id
const getSupportById = async (id: string) => {
  const result = await prisma.support.findUnique({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Support not found");
  }

  return result;
};

// update my support
const updateMySupport = async (
  userId: string,
  supportId: string,
  data: any
) => {
  // find user
  const findUser = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // find support
  const findSupport = await prisma.support.findUnique({
    where: { id: supportId, userId },
  });
  if (!findSupport) {
    throw new ApiError(httpStatus.NOT_FOUND, "Support not found");
  }

  const result = await prisma.support.update({
    where: { id: supportId },
    data,
  });
  return result;
};

// delete my support
const deleteMySupport = async (userId: string, supportId: string) => {
  // find user
  const findUser = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // find support
  const findSupport = await prisma.support.findUnique({
    where: { id: supportId, userId },
  });
  if (!findSupport) {
    throw new ApiError(httpStatus.NOT_FOUND, "Support not found");
  }

  const result = await prisma.support.delete({
    where: { id: findSupport.id },
  });
  return result;
};

export const SupportService = {
  createSupport,
  getAllSupport,
  getMySupport,
  getSupportById,
  updateMySupport,
  deleteMySupport,
};
