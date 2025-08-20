import { UserStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";



// verify email and phone number
const verifyEmailAndPhoneNumber = async (userId: string) => {
  // const result = await prisma.user.updateMany({ where: { id: userId }, data: { emailVerified: true, phoneVerified: true } });
  // return result;
};

// app about

export const SettingService = {
  verifyEmailAndPhoneNumber,
};
