import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { CarRentalBookingService } from "./carBooking.service";

// create car rental booking
const createCarBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const carId = req.params.carId;
  const data = req.body;
  const result = await CarRentalBookingService.createCarBooking(
    userId,
    carId,
    data
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car Booking created successfully",
    data: result,
  });
});

// get all car rental bookings
const getAllCarBookings = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const result = await CarRentalBookingService.getAllCarBookings(partnerId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car Bookings fetched successfully",
    data: result,
  });
});

// get single car rental booking
const getSingleCarBooking = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await CarRentalBookingService.getSingleCarBooking(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car Booking fetched successfully",
    data: result,
  });
});

// get all my car rental bookings
const getAllMyCarBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await CarRentalBookingService.getAllMyCarBookings(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My Car bookings fetched successfully",
    data: result,
  });
});

export const CarRentalBookingController = {
  createCarBooking,
  getAllCarBookings,
  getSingleCarBooking,
  getAllMyCarBookings,
};
