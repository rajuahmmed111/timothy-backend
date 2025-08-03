import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { HotelBookingService } from "./hotelBooking.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

const createHotelBooking = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const result = await HotelBookingService.createHotelBooking(
    partnerId,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel Booking created successfully",
    data: result,
  });
});

// get all hotel bookings
const getAllHotelBookings = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const result = await HotelBookingService.getAllHotelBookings(partnerId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel bookings fetched successfully",
    data: result,
  });
});

// get hotel booking by id
const getHotelBookingById = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const bookingId = req.params.id;
  const result = await HotelBookingService.getHotelBookingById(
    partnerId,
    bookingId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel booking fetched successfully",
    data: result,
  });
});

// update hotel booking status
const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const bookingId = req.params.id;
  const { bookingStatus } = req.body;

  const result = await HotelBookingService.updateBookingStatus(
    partnerId,
    bookingId,
    bookingStatus
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking status updated successfully",
    data: result,
  });
});

export const HotelBookingController = {
  createHotelBooking,
  getAllHotelBookings,
  getHotelBookingById,
  updateBookingStatus,
};
