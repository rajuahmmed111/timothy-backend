import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { PrivacyServices } from "./policy.service";

// create privacy policy
const createPolicy = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const result = await PrivacyServices.createPolicy(adminId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Privacy Policy created successfully",
    data: result,
  });
});


// get privacy policy
const getPolicy = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const result = await PrivacyServices.getPolicyByAdminId(adminId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Privacy Policy fetched successfully",
    data: result,
  });
});

// update privacy policy
const updatePolicy = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const result = await PrivacyServices.updatePolicyByAdminId(adminId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Privacy Policy updated successfully",
    data: result,
  });
});

export const PrivacyController = {
  createPolicy,
  getPolicy,
  updatePolicy,
};