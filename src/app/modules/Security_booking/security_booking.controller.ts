import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { SecurityBookingService } from "./security_booking.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

const createSecurityBooking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const securityId = req.params.id;
    const data = req.body;
    const result = await SecurityBookingService.createSecurityBooking(userId, securityId, data);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Booking created successfully",
      data: result,
    });
  }
);

export const SecurityBookingController = {
  createSecurityBooking,
};
