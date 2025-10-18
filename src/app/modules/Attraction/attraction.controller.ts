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

// create attraction appeal
const createAttractionAppeal = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AttractionService.createAttractionAppeal(req);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Attraction created successfully",
      data: result,
    });
  }
);

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

// get all attractions appeals
const getAllAttractionsAppeals = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await AttractionService.getAllAttractionsAppeals(
      filter,
      options
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attractions fetched successfully",
      data: result,
    });
  }
);

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

// get all attractions appeals for partner
const getAllAttractionsAppealsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const attractionId = req.params.attractionId;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await AttractionService.getAllAttractionsAppealsForPartner(
      attractionId,
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
  const appealId = req.params.appealId;
  const result = await AttractionService.getSingleAttraction(appealId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attraction fetched successfully",
    data: result,
  });
});

// get single attraction appeal
const getSingleAttractionAppeal = catchAsync(
  async (req: Request, res: Response) => {
    const appealId = req.params.appealId;
    const result = await AttractionService.getSingleAttractionAppeal(appealId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attraction appeal fetched successfully",
      data: result,
    });
  }
);

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

// update appeal
const updateAttractionAppeal = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AttractionService.updateAttractionAppeal(req);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Appeal updated successfully",
      data: result,
    });
  }
);

export const AttractionController = {
  createAttraction,
  createAttractionAppeal,
  getAllAttractions,
  getAllAttractionsAppeals,
  getAllAttractionsForPartner,
  getAllAttractionsAppealsForPartner,
  getSingleAttraction,
  getSingleAttractionAppeal,
  updateAttraction,
  updateAttractionAppeal,
};
