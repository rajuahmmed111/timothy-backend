import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { CarRentalService } from "./carRental.service";
import { filterField } from "./carRental.constant";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";

// Create Car Rental
const createCarRental = catchAsync(async (req: Request, res: Response) => {
  const result = await CarRentalService.createCarRental(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Car rental created successfully",
    data: result,
  });
});

// get all car rentals
const getAllCarRentals = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await CarRentalService.getAllCarRentals(filter, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car rentals fetched successfully",
    data: result,
  });
});

// get all my created car rentals for partner
const getAllCarRentalsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await CarRentalService.getAllCarRentalsForPartner(
      partnerId,
      filter,
      options
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My car rentals fetched successfully",
      data: result,
    });
  }
);

// get single car rental
const getSingleCarRental = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await CarRentalService.getSingleCarRental(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car rental fetched successfully",
    data: result,
  });
});

// Update Car Rental
const updateCarRental = catchAsync(async (req, res) => {
  const carId = req.params.id;
  const result = await CarRentalService.updateCarRental(carId, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car rental updated successfully",
    data: result,
  });
});

export const CarRentalController = {
  createCarRental,
  getAllCarRentals,
  getAllCarRentalsForPartner,
  getSingleCarRental,
  updateCarRental,
};
