import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { FinanceService } from "./finance.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// get all service providers finances
const getAllProvidersFinances = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const result = await FinanceService.getAllProvidersFinances(partnerId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Finances fetched successfully",
      data: result,
    });
  }
);

export const FinanceController = {
  getAllProvidersFinances,
};
