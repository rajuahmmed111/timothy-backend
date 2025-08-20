import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { SettingService } from "./setting.service";

// delete my account
const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await SettingService.deleteMyAccount(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My account deleted successfully",
    data: result,
  });
});

// verify email and phone number
const verifyEmailAndPhoneNumber = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await SettingService.verifyEmailAndPhoneNumber(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email and phone number verified successfully",
    data: result,
  });
});

export const SettingController = {
  deleteMyAccount,
  verifyEmailAndPhoneNumber,
};
