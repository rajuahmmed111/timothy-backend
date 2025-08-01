import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { HotelBookingService } from "./hotelBooking.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

const createHotelBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await HotelBookingService.createHotelBooking(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel Booking created successfully",
    data: result,
  });
});

export const HotelBookingController = {
  createHotelBooking,
};
