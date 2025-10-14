import { UserStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// verify email and phone number
const verifyEmailAndPhoneNumber = async (userId: string) => {
  // const result = await prisma.user.updateMany({ where: { id: userId }, data: { emailVerified: true, phoneVerified: true } });
  // return result;
};

// create app about
const createOrUpdateAbout = async (payload: any) => {
  // check if already exists
  const existing = await prisma.about_App.findFirst();

  if (existing) {
    // Update
    return prisma.about_App.update({
      where: { id: existing.id },
      data: payload,
    });
  } else {
    // Create
    return prisma.about_App.create({
      data: payload,
    });
  }
};

const getAbout = async () => {
  const result = await prisma.about_App.findFirst();

  if (!result) {
    throw new Error("About App not found");
  }

  return result;
};

// create customer contact info
const createCustomerContactInfo = async (payload: any) => {



};

const getCustomerContactInfo = async () => {
  const result = await prisma.customerContact.findFirst();

  if (!result) {
    throw new Error("Customer contact info not found");
  }

  return result;
};

// updateNotificationSettings
const updateNotificationSettings = async (
  userId: string,
  payload: {
    supportNotification?: boolean;
    paymentNotification?: boolean;
    emailNotification?: boolean;
  }
) => {
  // find admin
  const findAdmin = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!findAdmin) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return prisma.user.update({
    where: { id: findAdmin.id },
    data: {
      supportNotification: payload.supportNotification,
      paymentNotification: payload.paymentNotification,
      emailNotification: payload.emailNotification,
    },
    select: {
      id: true,
      supportNotification: true,
      paymentNotification: true,
      emailNotification: true,
    },
  });
};

export const SettingService = {
  verifyEmailAndPhoneNumber,
  createOrUpdateAbout,
  getAbout,
  createCustomerContactInfo,
  getCustomerContactInfo,
  updateNotificationSettings,
};
