import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { CarRentalService } from "./carRental.service";
import { filterField } from "./carRental.constant";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";
import { getUserCurrency } from "../../../helpars/detectionLocality";

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

// get all car active listing by partnerId
const getAllCarActiveListingByPartnerId = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const options = pick(req.query, paginationFields);
    const result = await CarRentalService.getAllCarActiveListingByPartnerId(
      partnerId,
      options
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Car fetched successfully",
      data: result,
    });
  }
);

// get all car available by partnerId
const getAllAvailableListingCarByPartnerId = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const options = pick(req.query, paginationFields);
    const result = await CarRentalService.getAllAvailableListingCarByPartnerId(
      partnerId,
      options
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Car fetched successfully",
      data: result,
    });
  }
);

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
  const userCurrency = await getUserCurrency(req);
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await CarRentalService.getAllCarRentalsCars(
    filter,
    options,
    userCurrency
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car fetched successfully",
    data: result,
  });
});

// get all car rentals cars by carRental carRentalId
const getAllCarRentalsCarsByCarRentalId = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const carRentalId = req.params.carRentalId;
    const result = await CarRentalService.getAllCarRentalsCarsByCarRentalId(
      filter,
      options,
      carRentalId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Car fetched successfully",
      data: result,
    });
  }
);

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

// delete Car Rental
const deleteCarRental = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const carRentalId = req.params.car_RentalId;
  const result = await CarRentalService.deleteCarRental(carRentalId, partnerId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car rental deleted successfully",
    data: result,
  });
});

// delete Car
const deleteCar = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const carId = req.params.carId;
  const result = await CarRentalService.deleteCar(carId, partnerId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Car deleted successfully",
    data: result,
  });
});

export const CarRentalController = {
  createCarRental,
  createCar,
  getAllCarActiveListingByPartnerId,
  getAllAvailableListingCarByPartnerId,
  getAllCarRentals,
  getAllCarRentalsCars,
  getAllCarRentalsCarsByCarRentalId,
  getAllCarRentalsForPartner,
  getAllCarRentalsCarsForPartner,
  getSingleCarRental,
  getSingleCar,
  updateCarRental,
  updateCar,
  deleteCarRental,
  deleteCar,
};
