import { Request } from "express";
import prisma from "../../../shared/prisma";
import { IUploadedFile } from "../../../interfaces/file";
import { uploadFile } from "../../../helpars/fileUploader";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { Hotel, EveryServiceStatus, Prisma } from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { IHotelFilterRequest } from "./hotel.interface";
import { searchableFields } from "./hotel.constant";

// create hotel
const createHotel = async (req: Request) => {
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

  const hotelLogoFile = files?.businessLogo?.[0];
  const roomImageFiles = files?.hotelRoomImages || [];
  const docsFiles = files?.hotelDocs || [];

  // Upload logo
  let businessLogo = "https://i.ibb.co/zWxSgQL8/download.png";
  if (hotelLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(hotelLogoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // Upload multiple room images
  let roomImageUrls: string[] = [];
  if (roomImageFiles.length > 0) {
    const uploads = await Promise.all(
      roomImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    roomImageUrls = uploads.map((img) => img?.secure_url || "");
  }

  // Upload multiple docs
  let hotelDocUrls: string[] = [];
  if (docsFiles.length > 0) {
    const docUploads = await Promise.all(
      docsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    hotelDocUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    hotelBusinessName,
    hotelName,
    hotelBusinessType,
    hotelRegNum,
    hotelRegDate,
    hotelPhone,
    hotelEmail,
    businessTagline,
    businessDescription,
    hotelRoomType,
    hotelRoomPriceNight,
    hotelAC,
    hotelParking,
    hoitelWifi,
    hotelBreakfast,
    hotelPool,
    hotelRating,
    hotelSmoking,
    hotelTv,
    hotelWashing,
    hotelBookingCondition,
    hotelCancelationPolicy,
    // hotelDocs,
    hotelRoomDescription,
    hotelAddress,
    hotelCity,
    hotelPostalCode,
    hotelDistrict,
    hotelCountry,
    hotelRoomCapacity,
    category,
    discount,
  } = req.body;

  const result = await prisma.hotel.create({
    data: {
      hotelBusinessName,
      hotelName,
      hotelBusinessType,
      hotelRegNum,
      hotelRegDate,
      hotelPhone,
      hotelEmail,
      businessTagline,
      businessDescription,
      businessLogo,
      hotelRoomType,
      hotelRoomPriceNight: parseInt(hotelRoomPriceNight),
      hotelAC: hotelAC === "true",
      hotelParking: hotelParking === "true",
      hoitelWifi: hoitelWifi === "true",
      hotelBreakfast: hotelBreakfast === "true",
      hotelPool: hotelPool === "true",
      hotelRating,
      hotelSmoking: hotelSmoking === "true",
      hotelTv: hotelTv === "true",
      hotelWashing: hotelWashing === "true",
      hotelBookingCondition,
      hotelCancelationPolicy,
      hotelDocs: hotelDocUrls,
      hotelRoomDescription,
      hotelAddress,
      hotelCity,
      hotelPostalCode,
      hotelDistrict,
      hotelCountry,
      hotelRoomCapacity,
      hotelRoomImages: roomImageUrls,
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
      partnerId: partnerId,
    },
  });

  return result;
};

// get all hotels with search filtering and pagination
const getAllHotels = async (
  params: IHotelFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.HotelWhereInput[] = [];

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

  const where: Prisma.HotelWhereInput = { AND: filters };

  const result = await prisma.hotel.findMany({
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
  const total = await prisma.hotel.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get all my created hotels for partner
const getAllHotelsForPartner = async (
  partnerId: string,
  params: IHotelFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.HotelWhereInput[] = [];

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

  const where: Prisma.HotelWhereInput = { AND: filters };

  const result = await prisma.hotel.findMany({
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


  const total = await prisma.hotel.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get all hotels for admin
const getAllHotelsForAdmin = async () =>
  prisma.hotel.findMany({
    where: { isBooked: EveryServiceStatus.AVAILABLE },
  });

// get single hotel
const getSingleHotel = async (hotelId: string) => {
  const result = await prisma.hotel.findUnique({
    where: { id: hotelId, isBooked: EveryServiceStatus.AVAILABLE },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  return result;
};

// get popular hotels
const getPopularHotels = async (
  params: IHotelFilterRequest
): Promise<Hotel[]> => {
  const { searchTerm, ...filterData } = params;

  const filters: Prisma.HotelWhereInput[] = [];

  // text search
  if (searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // exact field match filters
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const where: Prisma.HotelWhereInput = {
    AND: filters,
    // hotelRating: {
    //   not: null,
    // },
  };

  // get only isBooked  AVAILABLE hotels
  filters.push({
    isBooked: EveryServiceStatus.AVAILABLE,
  });

  const result = await prisma.hotel.findMany({
    where,
    orderBy: {
      hotelRating: "desc",
    },
    take: 10,
  });

  return result;
};

// add favorite hotel
const toggleFavorite = async (userId: string, hotelId: string) => {
  const existing = await prisma.favorite.findUnique({
    where: {
      userId_hotelId: {
        userId,
        hotelId,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        userId_hotelId: {
          userId,
          hotelId,
        },
      },
    });
    return { isFavorite: false };
  } else {
    await prisma.favorite.create({
      data: {
        userId,
        hotelId,
      },
    });
    return { isFavorite: true };
  }
};

// gets all favorite hotels
const getAllFavoriteHotels = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: user.id,
    },
    include: {
      hotel: true,
    },
  });

  return favorites;
};

// update hotel
const updateHotel = async (hotelId: string, req: Request) => {

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }

  // Find hotel to update
  const existingHotel = await prisma.hotel.findUnique({
    where: { id: hotelId, isBooked: EveryServiceStatus.AVAILABLE },
  });

  if (!existingHotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  // Check ownership
  if (existingHotel.partnerId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You do not have permission to update this hotel"
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  // Handle file uploads
  let businessLogo = existingHotel.businessLogo;
  const hotelLogoFile = files?.businessLogo?.[0];
  if (hotelLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(hotelLogoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  let roomImageUrls = existingHotel.hotelRoomImages || [];
  const roomImageFiles = files?.hotelRoomImages || [];
  if (roomImageFiles.length > 0) {
    const uploads = await Promise.all(
      roomImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    roomImageUrls = uploads.map((img) => img?.secure_url || "").filter(Boolean);
  }

  let hotelDocUrls = existingHotel.hotelDocs || [];
  const docsFiles = files?.hotelDocs || [];
  if (docsFiles.length > 0) {
    const docUploads = await Promise.all(
      docsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    hotelDocUrls = docUploads
      .map((img) => img?.secure_url || "")
      .filter(Boolean);
  }

  // partial update allowed
  const {
    hotelBusinessName,
    hotelName,
    hotelBusinessType,
    hotelRegNum,
    hotelRegDate,
    hotelPhone,
    hotelEmail,
    businessTagline,
    businessDescription,
    hotelRoomType,
    hotelRoomPriceNight,
    hotelAC,
    hotelParking,
    hoitelWifi,
    hotelBreakfast,
    hotelPool,
    hotelRating,
    hotelSmoking,
    hotelTv,
    hotelWashing,
    hotelBookingCondition,
    hotelCancelationPolicy,
    hotelRoomDescription,
    hotelAddress,
    hotelCity,
    hotelPostalCode,
    hotelDistrict,
    hotelCountry,
    hotelRoomCapacity,
    category,
    discount,
  } = req.body;

  const updatedHotel = await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      hotelBusinessName: hotelBusinessName ?? existingHotel.hotelBusinessName,
      hotelName: hotelName ?? existingHotel.hotelName,
      hotelBusinessType: hotelBusinessType ?? existingHotel.hotelBusinessType,
      hotelRegNum: hotelRegNum ?? existingHotel.hotelRegNum,
      hotelRegDate: hotelRegDate ?? existingHotel.hotelRegDate,
      hotelPhone: hotelPhone ?? existingHotel.hotelPhone,
      hotelEmail: hotelEmail ?? existingHotel.hotelEmail,
      businessTagline: businessTagline ?? existingHotel.businessTagline,
      businessDescription:
        businessDescription ?? existingHotel.businessDescription,
      businessLogo,
      hotelRoomType: hotelRoomType ?? existingHotel.hotelRoomType,
      hotelRoomPriceNight: hotelRoomPriceNight
        ? parseInt(hotelRoomPriceNight)
        : existingHotel.hotelRoomPriceNight,
      hotelAC:
        hotelAC !== undefined ? hotelAC === "true" : existingHotel.hotelAC,
      hotelParking:
        hotelParking !== undefined
          ? hotelParking === "true"
          : existingHotel.hotelParking,
      hoitelWifi:
        hoitelWifi !== undefined
          ? hoitelWifi === "true"
          : existingHotel.hoitelWifi,
      hotelBreakfast:
        hotelBreakfast !== undefined
          ? hotelBreakfast === "true"
          : existingHotel.hotelBreakfast,
      hotelPool:
        hotelPool !== undefined
          ? hotelPool === "true"
          : existingHotel.hotelPool,
      hotelRating: hotelRating ?? existingHotel.hotelRating,
      hotelSmoking:
        hotelSmoking !== undefined
          ? hotelSmoking === "true"
          : existingHotel.hotelSmoking,
      hotelTv:
        hotelTv !== undefined ? hotelTv === "true" : existingHotel.hotelTv,
      hotelWashing:
        hotelWashing !== undefined
          ? hotelWashing === "true"
          : existingHotel.hotelWashing,
      hotelBookingCondition:
        hotelBookingCondition ?? existingHotel.hotelBookingCondition,
      hotelCancelationPolicy:
        hotelCancelationPolicy ?? existingHotel.hotelCancelationPolicy,
      hotelDocs: hotelDocUrls,
      hotelRoomDescription:
        hotelRoomDescription ?? existingHotel.hotelRoomDescription,
      hotelAddress: hotelAddress ?? existingHotel.hotelAddress,
      hotelCity: hotelCity ?? existingHotel.hotelCity,
      hotelPostalCode: hotelPostalCode ?? existingHotel.hotelPostalCode,
      hotelDistrict: hotelDistrict ?? existingHotel.hotelDistrict,
      hotelCountry: hotelCountry ?? existingHotel.hotelCountry,
      hotelRoomCapacity: hotelRoomCapacity ?? existingHotel.hotelRoomCapacity,
      hotelRoomImages: roomImageUrls,
      category: category ?? existingHotel.category,
      discount: discount ? parseFloat(discount) : existingHotel.discount,
    },
  });

  return updatedHotel;
};

export const HotelService = {
  createHotel,
  getAllHotels,
  getAllHotelsForPartner,
  getSingleHotel,
  getPopularHotels,
  toggleFavorite,
  getAllFavoriteHotels,
  updateHotel,
};
