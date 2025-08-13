import e, { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { AttractionService } from "./attraction.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create attraction
const createAttraction = catchAsync(async (req: Request, res: Response) => {
  const result = await AttractionService.createAttraction(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Attraction created successfully",
    data: result,
  });
});

export const AttractionController = {
  createAttraction,
};
