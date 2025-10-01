import { Request } from "express";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { uploadFile } from "../../../helpars/fileUploader";
import { ICarRentalFilter } from "./carRental.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { EveryServiceStatus, Prisma } from "@prisma/client";
import { searchableFields } from "./carRental.constant";

// Create Car Rental
const createCarRental = async (req: Request) => {
  const partnerId = req.user?.id;

  // Check if partner exists
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // service check
  if (
    partnerExists.isHotel ||
    partnerExists.isSecurity ||
    partnerExists.isAttraction
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can only provide one type of service. You already provide another service."
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const carLogoFile = files?.businessLogo?.[0];
  const carDocsFiles = files?.carDocs || [];

  // Upload logo
  let businessLogo = "https://i.ibb.co/zWxSgQL8/download.png";
  if (carLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(carLogoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // Upload multiple car docs
  let carDocUrls: string[] = [];
  if (carDocsFiles.length > 0) {
    const docUploads = await Promise.all(
      carDocsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    carDocUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    carBusinessName,
    carName,
    carBusinessType,
    carRegNum,
    carRegDate,
    carPhone,
    carEmail,
    carTagline,
    carRentalDescription,
    carBookingCondition,
    carCancelationPolicy,
  } = req.body;

  const result = await prisma.car_Rental.create({
    data: {
      carBusinessName,
      carName,
      carBusinessType,
      carRegNum,
      carRegDate,
      carPhone,
      carEmail,
      carTagline,
      carRentalDescription,
      carBookingCondition,
      carCancelationPolicy,
      businessLogo,
      carDocs: carDocUrls,
      partnerId,
    },
  });

  // update partner car count
  await prisma.user.update({
    where: { id: partnerExists.id },
    data: { isCar: true },
  });

  return result;
};

// Create Car
const createCar = async (req: Request) => {
  const partnerId = req.user?.id;

  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const carImageFiles = files?.carImages || [];
  const carDocsFiles = files?.carDocs || [];

  // Upload multiple car images
  let carImageUrls: string[] = [];
  if (carImageFiles.length > 0) {
    const uploads = await Promise.all(
      carImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    carImageUrls = uploads.map((img) => img?.secure_url || "");
  }

  // Upload multiple car docs
  let carDocUrls: string[] = [];
  if (carDocsFiles.length > 0) {
    const docUploads = await Promise.all(
      carDocsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    carDocUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    carBusinessName,
    carName,
    carBusinessType,
    carRegNum,
    carRegDate,
    carPhone,
    carEmail,
    carAddress,
    carCity,
    carPostalCode,
    carDistrict,
    carCountry,
    carDescription,
    carServicesOffered,
    carBookingCondition,
    carCancelationPolicy,
    carType,
    carSeats,
    carOilType,
    carEngineType,
    carTransmission,
    carPower,
    carDrivetrain,
    carMileage,
    carModel,
    carCapacity,
    carColor,
    fuelType,
    gearType,
    carRating,
    carPriceDay,
    carBookingAbleDays,
    category,
    discount,
  } = req.body;

  const result = await prisma.car_Rental.create({
    data: {
      carBusinessName,
      carName,
      carBusinessType,
      carRegNum,
      carRegDate,
      carPhone,
      carEmail,
      carAddress,
      carCity,
      carPostalCode,
      carDistrict,
      carCountry,
      carDescription,
      carImages: carImageUrls,
      carServicesOffered: Array.isArray(carServicesOffered)
        ? carServicesOffered
        : carServicesOffered?.split(",") || [],
      carBookingCondition,
      carCancelationPolicy,
      carDocs: carDocUrls,
      carType,
      carSeats,
      carOilType,
      carEngineType,
      carTransmission,
      carPower,
      carDrivetrain,
      carMileage,
      carModel,
      carCapacity,
      carColor,
      fuelType,
      gearType,
      carRating: carRating ? carRating.toString() : undefined,
      carPriceDay: parseInt(carPriceDay),
      carBookingAbleDays: Array.isArray(carBookingAbleDays)
        ? carBookingAbleDays
        : carBookingAbleDays?.split(",") || [],
      category: category || undefined,
      discount: discount ? parseFloat(discount) : 0,
      partnerId,
    },
  });

  // update partner car count
  await prisma.user.update({
    where: { id: partnerExists.id },
    data: { isCar: true },
  });

  return result;
};

// get all car rentals
const getAllCarRentals = async (
  params: ICarRentalFilter,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.Car_RentalWhereInput[] = [];

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  // get only isBooked  AVAILABLE hotels
  filters.push({
    isBooked: EveryServiceStatus.AVAILABLE,
  });

  const where: Prisma.Car_RentalWhereInput = { AND: filters };

  const result = await prisma.car_Rental.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: "desc",
          },
  });
  const total = await prisma.car_Rental.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get all car rentals for partner
const getAllCarRentalsForPartner = async (
  partnerId: string,
  params: ICarRentalFilter,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.Car_RentalWhereInput[] = [];

  filters.push({
    partnerId,
  });

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const where: Prisma.Car_RentalWhereInput = { AND: filters };

  const result = await prisma.car_Rental.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: "desc",
          },
    include: {
      user: true,
    },
  });

  const total = await prisma.car_Rental.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get single car rental
const getSingleCarRental = async (carRentalId: string) => {
  const result = await prisma.car_Rental.findUnique({
    where: { id: carRentalId },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Car Rental not found");
  }
  return result;
};

// Update Car Rental
const updateCarRental = async (req: Request) => {
  const partnerId = req.user?.id;
  const carRentalId = req.params.id;

  // Check if partner exists
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // Check if Car Rental exists and belongs to partner
  const existingCarRental = await prisma.car_Rental.findUnique({
    where: { id: carRentalId },
  });
  if (!existingCarRental) {
    throw new ApiError(httpStatus.NOT_FOUND, "Car Rental not found");
  }
  if (existingCarRental.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Not authorized to update this Car Rental"
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const carImageFiles = files?.carImages || [];
  const carDocsFiles = files?.carDocs || [];

  // Upload new car images if provided, else keep existing
  let carImageUrls = existingCarRental.carImages;
  if (carImageFiles.length > 0) {
    const uploads = await Promise.all(
      carImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    carImageUrls = uploads.map((img) => img?.secure_url || "");
  }

  // Upload new car docs if provided, else keep existing
  let carDocUrls = existingCarRental.carDocs;
  if (carDocsFiles.length > 0) {
    const docUploads = await Promise.all(
      carDocsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    carDocUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    carBusinessName,
    carName,
    carBusinessType,
    carRegNum,
    carRegDate,
    carPhone,
    carEmail,
    carAddress,
    carCity,
    carPostalCode,
    carDistrict,
    carCountry,
    carDescription,
    carServicesOffered,
    carBookingCondition,
    carCancelationPolicy,
    carType,
    carSeats,
    carOilType,
    carEngineType,
    carTransmission,
    carPower,
    carDrivetrain,
    carMileage,
    carModel,
    carCapacity,
    carColor,
    fuelType,
    gearType,
    carRating,
    carPriceDay,
    carBookingAbleDays,
    category,
    discount,
  } = req.body;

  const updatedCarRental = await prisma.car_Rental.update({
    where: { id: carRentalId },
    data: {
      carBusinessName,
      carName,
      carBusinessType,
      carRegNum,
      carRegDate,
      carPhone,
      carEmail,
      carAddress,
      carCity,
      carPostalCode,
      carDistrict,
      carCountry,
      carDescription,
      carImages: carImageUrls,
      carServicesOffered: Array.isArray(carServicesOffered)
        ? carServicesOffered
        : carServicesOffered?.split(",") || [],
      carBookingCondition,
      carCancelationPolicy,
      carDocs: carDocUrls,
      carType,
      carSeats,
      carOilType,
      carEngineType,
      carTransmission,
      carPower,
      carDrivetrain,
      carMileage,
      carModel,
      carCapacity,
      carColor,
      fuelType,
      gearType,
      carRating: carRating ? carRating.toString() : undefined,
      carPriceDay: carPriceDay ? parseInt(carPriceDay) : undefined,
      carBookingAbleDays: Array.isArray(carBookingAbleDays)
        ? carBookingAbleDays
        : carBookingAbleDays?.split(",") || [],
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
    },
  });

  return updatedCarRental;
};

export const CarRentalService = {
  createCarRental,
  createCar,
  getAllCarRentals,
  getAllCarRentalsForPartner,
  getSingleCarRental,
  updateCarRental,
};
