import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatisticsService } from "./statistics.service";
import httpStatus from "http-status";
import { pick } from "../../../shared/pick";
import { filterField } from "./statistics.constant";

// get overview total user, total partner,total contracts , admin earnings
const getOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await StatisticsService.getOverview();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Statistics fetched successfully",
    data: result,
  });
});

// get payment with user analysis
const paymentWithUserAnalysis = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const result = await StatisticsService.paymentWithUserAnalysis(filter);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

export const StatisticsController = {
  getOverview,
  paymentWithUserAnalysis,
};
