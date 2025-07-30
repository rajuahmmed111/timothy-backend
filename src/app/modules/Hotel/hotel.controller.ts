import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { HotelService } from "./hotel.service";

// create hotel
const createHotel = catchAsync(async (req: Request, res: Response) => {
    // const adminId = req.user?.id;
    const result = await HotelService.createHotel(req);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Hotel created successfully",
        data: result,
    });
})

export const HotelController = { createHotel };