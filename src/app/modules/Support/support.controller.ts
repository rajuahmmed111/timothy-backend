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

// get my support
const getMySupport = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await SupportService.getMySupport(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support fetched successfully",
    data: result,
  });
});

// get support by id
const getSupportById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await SupportService.getSupportById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support fetched successfully",
    data: result,
  });
});

// update my support
const updateMySupport = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const supportId = req.params.supportId;
  const data = req.body;
  const result = await SupportService.updateMySupport(userId, supportId, data);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support updated successfully",
    data: result,
  });
});

// delete my support
const deleteMySupport = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const supportId = req.params.supportId;
  const result = await SupportService.deleteMySupport(userId, supportId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support deleted successfully",
    data: result,
  });
});

export const SupportController = {
  createSupport,
  getAllSupport,
  getMySupport,
  getSupportById,
  updateMySupport,
  deleteMySupport,
};
