import prisma from "../../../shared/prisma";

// delete my account
const deleteMyAccount = async (userId: string) => {
    const result = await prisma.user.deleteMany({ where: { id: userId } });
    return result;
};

// verify email and phone number
const verifyEmailAndPhoneNumber = async (userId: string) => {
    // const result = await prisma.user.updateMany({ where: { id: userId }, data: { emailVerified: true, phoneVerified: true } });
    // return result;
};

export const SettingService = {
    deleteMyAccount,
    verifyEmailAndPhoneNumber
};