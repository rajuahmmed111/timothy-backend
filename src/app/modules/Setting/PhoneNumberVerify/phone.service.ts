import httpStatus from "http-status";
import ApiError from "../../../../errors/ApiErrors";
import prisma from "../../../../shared/prisma";
import { generateOtp } from "../../../../utils/generateOtp";
import twilio from "twilio";
import config from "../../../../config";

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

// send otp to phone number
// const sendOtpToPhoneNumber = async (userId: string, contactNumber: string) => {
//   // check if user exists
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//   });
//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }

//   // generate otp
//   const randomOtp = generateOtp(4);
//   // 5 minutes
//   const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

//   // update user with OTP + expiry
//   await prisma.user.update({
//     where: { id: user.id },
//     data: { otp: randomOtp, otpExpiry: otpExpiry },
//   });

//   // send SMS using twilio
//   const sms = await client.messages.create({
//     body: `Your OTP is ${randomOtp}`,
//     from: "+19787238911",
//     to: contactNumber,
//   });

//   return { sms, success: true, message: "OTP sent successfully" };
// };
const sendOtpToPhoneNumber = async (userId: string, contactNumber: string) => {
  // 1️⃣ Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // 2️⃣ Generate OTP and expiry (valid for 5 mins)
  const randomOtp = generateOtp(4);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

  // 3️⃣ Update user with OTP
  await prisma.user.update({
    where: { id: user.id },
    data: { otp: randomOtp, otpExpiry },
  });

  // 4️⃣ Send SMS via Twilio
  try {
    const sms = await client.messages.create({
      body: `🔐 Your verification code is: ${randomOtp}`,
      from: process.env.TWILIO_PHONE_NUMBER || "+19787238911",
      to: contactNumber.startsWith("+") ? contactNumber : `+${contactNumber}`,
    });

    return {
      success: true,
      message: "OTP sent successfully",
      sid: sms.sid,
    };
  } catch (error: any) {
    console.error("Twilio Error:", error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to send OTP: ${error.message}`
    );
  }
};

// verify otp
const verifyOtpToPhoneNumber = async (contactNumber: string, otp: string) => {};

export const OtpService = {
  sendOtpToPhoneNumber,
  verifyOtpToPhoneNumber,
};
