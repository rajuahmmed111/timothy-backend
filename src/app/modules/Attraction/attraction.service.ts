import { Request } from "express";
import { uploadFile } from "../../../helpars/fileUploader";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { EveryServiceStatus, Prisma } from "@prisma/client";
import { searchableFields } from "./attraction.constant";
import { IAttractionFilter } from "./attraction.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";

// create attraction
const createAttraction = async (req: Request) => {
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

  const attractionBusinessLogoFile = files?.attractionBusinessLogo?.[0];
  const attractionImageFiles = files?.attractionImages || [];
  const attractionDocsFiles = files?.attractionDocs || [];

  // Upload logo
  let attractionBusinessLogo = "https://i.ibb.co/zWxSgQL8/download.png";
  if (attractionBusinessLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(
      attractionBusinessLogoFile
    );
    attractionBusinessLogo = logoResult?.secure_url || attractionBusinessLogo;
  }

  // Upload multiple attraction images
  let attractionImages: string[] = [];
  if (attractionImageFiles.length > 0) {
    const uploads = await Promise.all(
      attractionImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    attractionImages = uploads.map((img) => img?.secure_url || "");
  }

  // Upload multiple attraction docs
  let attractionDocs: string[] = [];
  if (attractionDocsFiles.length > 0) {
    const uploads = await Promise.all(
      attractionDocsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    attractionDocs = uploads.map((img) => img?.secure_url || "");
  }

  const {
    attractionBusinessName,
    attractionName,
    attractionBusinessType,
    attractionRegNum,
    attractionRegDate,
    attractionBusinessTagline,
    attractionBusinessDescription,
    attractionBookingCondition,
    attractionCancelationPolicy,
    attractionServicesOffered,
    attractionRating,
    attractionDestinationType,
    attractionPriceDay,
    attractionDescription,
    attractionPhone,
    attractionEmail,
    attractionAddress,
    attractionCity,
    attractionPostalCode,
    attractionDistrict,
    attractionCountry,
    attractionBookingAble,
    category,
    discount,
    attractionReviewCount,
  } = req.body;

  const attraction = await prisma.attraction.create({
    data: {
      attractionBusinessName,
      attractionName,
      attractionBusinessType,
      attractionRegNum,
      attractionRegDate,
      attractionBusinessTagline,
      attractionBusinessDescription,
      attractionBusinessLogo,
      attractionBookingCondition,
      attractionCancelationPolicy,
      attractionDocs,
      attractionServicesOffered: Array.isArray(attractionServicesOffered)
        ? attractionServicesOffered
        : attractionServicesOffered?.split(","),
      attractionRating: attractionRating?.toString(),
      attractionDestinationType,
      attractionPriceDay: parseInt(attractionPriceDay),
      attractionDescription,
      attractionPhone,
      attractionEmail,
      attractionAddress,
      attractionCity,
      attractionPostalCode,
      attractionDistrict,
      attractionCountry,
      attractionImages,
      attractionBookingAble: Array.isArray(attractionBookingAble)
        ? attractionBookingAble
        : attractionBookingAble?.split(","),
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
      attractionReviewCount: attractionReviewCount
        ? parseInt(attractionReviewCount)
        : 0,
      partnerId,
    },
  });

  return attraction;
};

// get all attractions
const getAllAttractions = async (
  params: IAttractionFilter,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.AttractionWhereInput[] = [];

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

  const where: Prisma.AttractionWhereInput = { AND: filters };

  const result = await prisma.attraction.findMany({
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
  const total = await prisma.attraction.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get all attractions for partner
const getAllAttractionsForPartner = async (
  partnerId: string,
  params: IAttractionFilter,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.AttractionWhereInput[] = [];

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
    partnerId,
  });

  const where: Prisma.AttractionWhereInput = { AND: filters };

  const result = await prisma.attraction.findMany({
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
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
  const total = await prisma.attraction.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get single attraction
const getSingleAttraction = async (id: string) => {
  const result = await prisma.attraction.findUnique({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  }

  return result;
};

// update attraction
const updateAttraction = async (req: Request) => {
  const attractionId = req.params.id;
  const partnerId = req.user?.id;

  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const attractionExists = await prisma.attraction.findUnique({
    where: { id: attractionId },
  });
  if (!attractionExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  }

  if (attractionExists?.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update"
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const attractionBusinessLogoFile = files?.attractionBusinessLogo?.[0];
  const attractionImageFiles = files?.attractionImages || [];
  const attractionDocsFiles = files?.attractionDocs || [];

  // Upload logo
  let attractionBusinessLogo = attractionExists?.attractionBusinessLogo;
  if (attractionBusinessLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(
      attractionBusinessLogoFile
    );
    attractionBusinessLogo = logoResult?.secure_url || attractionBusinessLogo;
  }

  // Upload multiple attraction images
  let attractionImages: string[] = attractionExists?.attractionImages || [];
  if (attractionImageFiles.length > 0) {
    const uploads = await Promise.all(
      attractionImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    attractionImages = uploads.map((img) => img?.secure_url || "");
  }

  // Upload multiple attraction docs
  let attractionDocs: string[] = attractionExists?.attractionDocs || [];
  if (attractionDocsFiles.length > 0) {
    const uploads = await Promise.all(
      attractionDocsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    attractionDocs = uploads.map((img) => img?.secure_url || "");
  }

  const {
    attractionBusinessName,
    attractionName,
    attractionBusinessType,
    attractionRegNum,
    attractionRegDate,
    attractionBusinessTagline,
    attractionBusinessDescription,
    attractionBookingCondition,
    attractionCancelationPolicy,
    attractionServicesOffered,
    attractionRating,
    attractionDestinationType,
    attractionPriceDay,
    attractionDescription,
    attractionPhone,
    attractionEmail,
    attractionAddress,
    attractionCity,
    attractionPostalCode,
    attractionDistrict,
    attractionCountry,
    attractionBookingAble,
    category,
    discount,
    attractionReviewCount,
  } = req.body;

  const attraction = await prisma.attraction.update({
    where: { id: attractionId },
    data: {
      attractionBusinessName,
      attractionName,
      attractionBusinessType,
      attractionRegNum,
      attractionRegDate,
      attractionBusinessTagline,
      attractionBusinessDescription,
      attractionBusinessLogo,
      attractionBookingCondition,
      attractionCancelationPolicy,
      attractionDocs,
      attractionServicesOffered: Array.isArray(attractionServicesOffered)
        ? attractionServicesOffered
        : attractionServicesOffered?.split(","),
      attractionRating: attractionRating?.toString(),
      attractionDestinationType,
      attractionPriceDay: parseInt(attractionPriceDay),
      attractionDescription,
      attractionPhone,
      attractionEmail,
      attractionAddress,
      attractionCity,
      attractionPostalCode,
      attractionDistrict,
      attractionCountry,
      attractionImages,
      attractionBookingAble: Array.isArray(attractionBookingAble)
        ? attractionBookingAble
        : attractionBookingAble?.split(","),
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
      attractionReviewCount: attractionReviewCount
        ? parseInt(attractionReviewCount)
        : 0,
    },
  });

  return attraction;
};

export const AttractionService = {
  createAttraction,
  getAllAttractions,
  getAllAttractionsForPartner,
  getSingleAttraction,
  updateAttraction,
};
