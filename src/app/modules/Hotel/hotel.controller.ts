import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { HotelService } from "./hotel.service";

// create hotel
const createHotel = catchAsync(async (req: Request, res: Response) => {
  const result = await HotelService.createHotel(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Hotel created successfully",
    data: result,
  });
});

// get all hotels
const getAllHotels = catchAsync(async (req: Request, res: Response) => {
  const result = await HotelService.getAllHotels();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotels fetched successfully",
    data: result,
  });
});

// get single hotel
const getSingleHotel = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await HotelService.getSingleHotel(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel fetched successfully",
    data: result,
  });
});

// get popular hotels
const getPopularHotels = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

  const result = await HotelService.getPopularHotels(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Popular hotels fetched successfully",
    data: result,
  });
});

// update hotel
const updateHotel = catchAsync(async (req: Request, res: Response) => {
  const hotelId = req.params.id;
  const updatedHotel = await HotelService.updateHotel(hotelId, req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel updated successfully",
    data: updatedHotel,
  });
});

export const HotelController = {
  createHotel,
  getAllHotels,
  getSingleHotel,
  getPopularHotels,
  updateHotel,
};
