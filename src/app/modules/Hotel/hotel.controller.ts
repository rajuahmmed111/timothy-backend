import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { HotelService } from "./hotel.service";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";
import { filterField } from "./hotel.constant";

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
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await HotelService.getAllHotels(filter, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotels fetched successfully",
    data: result,
  });
});

// get all my created hotels for partner
const getAllHotelsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user.id;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await HotelService.getAllHotelsForPartner(partnerId, filter, options);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Hotels fetched successfully",
      data: result,
    });
  }
);

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
  const filter = pick(req.query, filterField);
  const result = await HotelService.getPopularHotels(filter);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Popular hotels fetched successfully",
    data: result,
  });
});

// add favorite hotel
const toggleFavorite = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const hotelId = req.params.hotelId;

  const result = await HotelService.toggleFavorite(userId, hotelId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.isFavorite ? "Hotel favorited" : "Hotel unfavorited",
    data: result,
  });
});

// gets all favorite hotels
const getAllFavoriteHotels = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await HotelService.getAllFavoriteHotels(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Favorite hotels fetched successfully",
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
  getAllHotelsForPartner,
  getSingleHotel,
  getPopularHotels,
  toggleFavorite,
  getAllFavoriteHotels,
  updateHotel,
};
