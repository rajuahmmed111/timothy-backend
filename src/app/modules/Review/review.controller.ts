import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReviewService } from "./review.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create hotel review
const createHotelReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { hotelId, rating, comment } = req.body;

  const result = await ReviewService.createHotelReview(
    userId,
    hotelId,
    rating,
    comment
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

// create security review
const createSecurityReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { securityId, rating, comment } = req.body;

  const result = await ReviewService.createSecurityReview(
    userId,
    securityId,
    rating,
    comment
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

// create car review
const createCarReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { carId, rating, comment } = req.body;

  const result = await ReviewService.createCarReview(
    userId,
    carId,
    rating,
    comment
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review created successfully",
    data: result,
  });

});

// create attraction review
const createAttractionReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { attractionId, rating, comment } = req.body;

  const result = await ReviewService.createAttractionReview(
    userId,
    attractionId,
    rating,
    comment
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

export const ReviewController = {
  createHotelReview,
  createSecurityReview,
  createCarReview,
  createAttractionReview
};
