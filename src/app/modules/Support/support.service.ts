import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";

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

export const SupportService = {
  createSupport,
  getAllSupport,
};
