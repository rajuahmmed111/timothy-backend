import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { CarRentalService } from "./carRental.service";
import { filterField } from "./carRental.constant";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";

// create Car Rental
const createCarRental = catchAsync(async (req: Request, res: Response) => {
  const result = await CarRentalService.createCarRental(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Car rental created successfully",
    data: result,
  });
});

// create Car
const createCar = catchAsync(async (req: Request, res: Response) => {
  const result = await CarRentalService.createCar(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Car created successfully",
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

// get all car rentals cars
const getAllCarRentalsCars = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await CarRentalService.getAllCarRentalsCars(filter, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car fetched successfully",
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

// get all my created car rentals cars for partner
const getAllCarRentalsCarsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const car_RentalId = req.params.car_RentalId;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await CarRentalService.getAllCarRentalsCarsForPartner(
      car_RentalId,
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

// get single car
const getSingleCar = catchAsync(async (req: Request, res: Response) => {
  const carId = req.params.carId;
  const result = await CarRentalService.getSingleCar(carId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car fetched successfully",
    data: result,
  });
});

// update Car Rental
const updateCarRental = catchAsync(async (req: Request, res: Response) => {
  const result = await CarRentalService.updateCarRental(req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car rental updated successfully",
    data: result,
  });
});

// update Car
const updateCar = catchAsync(async (req: Request, res: Response) => {
  const result = await CarRentalService.updateCar(req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car updated successfully",
    data: result,
  });
});

export const CarRentalController = {
  createCarRental,
  createCar,
  getAllCarRentals,
  getAllCarRentalsCars,
  getAllCarRentalsForPartner,
  getAllCarRentalsCarsForPartner,
  getSingleCarRental,
  getSingleCar,
  updateCarRental,
  updateCar,
};
