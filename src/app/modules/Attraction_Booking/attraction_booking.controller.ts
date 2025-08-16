import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { AttractionBookingService } from "./attraction_booking.service";

// create attraction booking
const createAttractionBooking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const attractionId = req.params.attractionId;
    const result = await AttractionBookingService.createAttractionBooking(
      userId,
      attractionId,
      req.body
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attraction Booking created successfully",
      data: result,
    });
  }
);

export const AttractionBookingController = {
  createAttractionBooking,
};
