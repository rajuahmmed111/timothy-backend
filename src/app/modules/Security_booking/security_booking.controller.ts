import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { SecurityBookingService } from "./security_booking.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create security booking
const createSecurityBooking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const security_GuardId = req.params.security_GuardId;
    const data = req.body;
    const result = await SecurityBookingService.createSecurityBooking(
      userId,
      security_GuardId,
      data
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Booking created successfully",
      data: result,
    });
  }
);

// get all security bookings
const getAllSecurityBookings = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const result = await SecurityBookingService.getAllSecurityBookings(partnerId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Bookings fetched successfully",
      data: result,
    });
  }
);

// get single security booking
const getSingleSecurityBooking = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await SecurityBookingService.getSingleSecurityBooking(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Booking fetched successfully",
      data: result,
    });
  }
);

// get all my security bookings
const getAllMySecurityBookings = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result = await SecurityBookingService.getAllMySecurityBookings(
      userId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My security bookings fetched successfully",
      data: result,
    });
  }
);

export const SecurityBookingController = {
  createSecurityBooking,
  getAllSecurityBookings,
  getSingleSecurityBooking,
  getAllMySecurityBookings,
};
