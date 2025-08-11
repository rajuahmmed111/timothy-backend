import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { HotelBookingService } from "./hotelBooking.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create hotel booking
const createHotelBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const hotelId = req.params.hotelId;
  const result = await HotelBookingService.createHotelBooking(
    userId,
    hotelId,
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

// get my all (hotel, security, car, attraction) bookings
const getAllMyBookings = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result = await HotelBookingService.getAllMyBookings(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My all bookings fetched successfully",
      data: result,
    });
  }
);

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

// cancel my (hotel, security, car, attraction) booking only user
const cancelMyHotelBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const bookingId = req.params.id;
  const { bookingStatus } = req.body;
  const result = await HotelBookingService.cancelMyHotelBooking(
    userId,
    bookingId,
    bookingStatus
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel booking cancelled successfully",
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
  getAllMyBookings,
  getHotelBookingById,
  cancelMyHotelBooking,
  updateBookingStatus,
};
