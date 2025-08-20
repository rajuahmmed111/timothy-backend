import { UserStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";

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

// create or update customer contact info
const createOrUpdateCustomerContactInfo = async (payload: any) => {
  // check if already exists
  const existing = await prisma.customerContact.findFirst();

  if (existing) {
    // Update
    return prisma.customerContact.update({
      where: { id: existing.id },
      data: payload,
    });
  } else {
    // Create
    return prisma.customerContact.create({
      data: payload,
    });
  }
};

const getCustomerContactInfo = async () => {
  const result = await prisma.customerContact.findFirst();

  if (!result) {
    throw new Error("Customer contact info not found");
  }

  return result;
};

export const SettingService = {
  verifyEmailAndPhoneNumber,
  createOrUpdateAbout,
  getAbout,
  createOrUpdateCustomerContactInfo,
  getCustomerContactInfo,
};
