import e, { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { AttractionService } from "./attraction.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { pick } from "../../../shared/pick";
import { filterField } from "./attraction.constant";
import { paginationFields } from "../../../constants/pagination";

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

// get all attractions
const getAllAttractions = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await AttractionService.getAllAttractions(filter, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attractions fetched successfully",
    data: result,
  });
});

// get all attractions for partner
const getAllAttractionsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await AttractionService.getAllAttractionsForPartner(
      partnerId,
      filter,
      options
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My attractions fetched successfully",
      data: result,
    });
  }
);

// get single attraction
const getSingleAttraction = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await AttractionService.getSingleAttraction(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attraction fetched successfully",
    data: result,
  });
});

// update attraction
const updateAttraction = catchAsync(async (req: Request, res: Response) => {
  const result = await AttractionService.updateAttraction(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attraction updated successfully",
    data: result,
  });
});

export const AttractionController = {
  createAttraction,
  getAllAttractions,
  getAllAttractionsForPartner,
  getSingleAttraction,
  updateAttraction,
};
