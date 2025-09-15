import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { SupportService } from "./support.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create support
const createSupport = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const data = req.body;
  const result = await SupportService.createSupport(userId, data);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Support created successfully",
    data: result,
  });
});

// get all support
const getAllSupport = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.getAllSupport();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support fetched successfully",
    data: result,
  });
});

export const SupportController = {
  createSupport,
  getAllSupport,
};
