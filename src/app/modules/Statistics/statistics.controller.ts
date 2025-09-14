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
    const result = await StatisticsService.paymentWithUserAnalysis();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

// financial metrics
const financialMetrics = catchAsync(async (req: Request, res: Response) => {
  const result = await StatisticsService.financialMetrics();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Statistics fetched successfully",
    data: result,
  });
});

// cancel refund and contracts
const cancelRefundAndContracts = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StatisticsService.cancelRefundAndContracts();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

// get all service provider for send report
const getAllServiceProviders = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StatisticsService.getAllServiceProviders();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service providers fetched successfully",
      data: result,
    });
  }
);

// get single service provider
const getSingleServiceProvider = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await StatisticsService.getSingleServiceProvider(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service provider fetched successfully",
      data: result,
    });
  }
);

// send report to service provider through email
const sendReportToServiceProviderThroughEmail = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result =
      await StatisticsService.sendReportToServiceProviderThroughEmail(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Report sent successfully",
      data: result,
    });
  }
);

export const StatisticsController = {
  getOverview,
  paymentWithUserAnalysis,
  financialMetrics,
  cancelRefundAndContracts,
  getAllServiceProviders,
  getSingleServiceProvider,
  sendReportToServiceProviderThroughEmail,
};
