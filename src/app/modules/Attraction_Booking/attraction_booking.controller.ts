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

// get all attraction bookings
const getAllAttractionBookings = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const result = await AttractionBookingService.getAllAttractionBookings(
      partnerId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attraction Bookings fetched successfully",
      data: result,
    });
  }
);

// get attraction booking by id
const getAttractionBookingById = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const id = req.params.id;
    const result = await AttractionBookingService.getAttractionBookingById(
      id,
      partnerId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attraction Booking fetched successfully",
      data: result,
    });
  }
);

// get all my attraction bookings
const getAllMyAttractionBookings = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result = await AttractionBookingService.getAllMyAttractionBookings(
      userId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My attraction bookings fetched successfully",
      data: result,
    });
  }
);

export const AttractionBookingController = {
  createAttractionBooking,
  getAllAttractionBookings,
  getAttractionBookingById,
  getAllMyAttractionBookings,
};
