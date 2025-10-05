import { Request } from "express";
import prisma from "../../../shared/prisma";
import { IUploadedFile } from "../../../interfaces/file";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  Hotel,
  EveryServiceStatus,
  Prisma,
  BookingStatus,
  Room,
} from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { IHotelFilterRequest } from "./hotel.interface";
import {
  numericFields,
  searchableFields,
  searchableFieldsHotel,
} from "./hotel.constant";
import { uploadFile } from "../../../helpars/fileUploader";

// create hotel
const createHotel = async (req: Request) => {
  const partnerId = req.user?.id;
  console.log(partnerId, "partnerId");
  console.log(req.body, "req.body");

  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // service check
  if (
    partnerExists.isSecurity ||
    partnerExists.isCar ||
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

  const hotelLogoFile = files?.businessLogo?.[0];
  const docsFiles = files?.hotelDocs || [];

  // Upload logo
  let businessLogo = "https://i.ibb.co/zWxSgQL8/download.png";
  if (hotelLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(hotelLogoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
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
    hotelBookingCondition,
    hotelCancelationPolicy,
    hotelLate,
    hotelLong,
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
      hotelBookingCondition,
      hotelCancelationPolicy,
      hotelDocs: hotelDocUrls,
      hotelLate,
      hotelLong,
      partnerId: partnerId,
    },
  });
  console.log(result, "result");

  // update partner hotel count
  await prisma.user.update({
    where: { id: partnerExists.id },
    data: { isHotel: true },
  });

  return result;
};

// create hotel room
const createHotelRoom = async (req: Request) => {
  const partnerId = req.user?.id;
  const hotelId = req.params.hotelId;

  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const hotelExists = await prisma.hotel.findUnique({
    where: { id: hotelId },
  });
  if (!hotelExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const roomImageFiles = files?.hotelRoomImages || [];
  const hotelImagesFile = files?.hotelImages || [];

  // Upload multiple room images
  let roomImageUrls: string[] = [];
  if (roomImageFiles.length > 0) {
    const uploads = await Promise.all(
      roomImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    roomImageUrls = uploads.map((img) => img?.secure_url || "");
  }

  // Upload multiple hotel images
  let hotelRoomUrls: string[] = [];
  if (hotelImagesFile.length > 0) {
    const docUploads = await Promise.all(
      hotelImagesFile.map((file) => uploadFile.uploadToCloudinary(file))
    );
    hotelRoomUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    hotelRoomType,
    hotelAC,
    hotelParking,
    hoitelWifi,
    hotelBreakfast,
    hotelPool,
    hotelRating,
    hotelSmoking,
    hotelTv,
    hotelWashing,
    hotelRoomDescription,
    hotelAddress,
    hotelCity,
    hotelPostalCode,
    hotelDistrict,
    hotelCountry,
    hotelRoomCapacity,
    hotelNumberOfRooms,
    hotelNumAdults,
    hotelNumChildren,
    hotelAccommodationType,
    hotelKitchen,
    hotelRestaurant,
    hotelGym,
    hotelSpa,
    hotel24HourFrontDesk,
    hotelAirportShuttle,
    hotelNoSmokingPreference,
    hotelNoNSmoking,
    hotelPetsAllowed,
    hotelNoPetsPreferences,
    hotelPetsNotAllowed,
    hotelLocationFeatureWaterView,
    hotelLocationFeatureIsland,
    hotelCoffeeBar,
    hotelRoomPriceNight,
    category,
    discount,
    hotelReviewCount,
  } = req.body;

  const result = await prisma.room.create({
    data: {
      hotelRoomType,
      hotelAC,
      hotelParking,
      hoitelWifi,
      hotelBreakfast,
      hotelPool,
      hotelRating,
      hotelSmoking,
      hotelTv,
      hotelWashing,
      hotelRoomDescription,
      hotelAddress,
      hotelCity,
      hotelPostalCode,
      hotelDistrict,
      hotelCountry,
      hotelRoomCapacity,
      hotelNumberOfRooms,
      hotelNumAdults,
      hotelNumChildren,
      hotelAccommodationType,
      hotelKitchen,
      hotelRestaurant,
      hotelGym,
      hotelSpa,
      hotel24HourFrontDesk,
      hotelAirportShuttle,
      hotelNoSmokingPreference,
      hotelNoNSmoking,
      hotelPetsAllowed,
      hotelNoPetsPreferences,
      hotelPetsNotAllowed,
      hotelLocationFeatureWaterView,
      hotelLocationFeatureIsland,
      hotelCoffeeBar,
      hotelRoomPriceNight,
      category,
      discount,
      hotelReviewCount,
      isBooked: EveryServiceStatus.AVAILABLE,
      hotelRoomImages: roomImageUrls,
      hotelImages: hotelRoomUrls,
      hotelId: hotelId,
      partnerId: partnerExists.id,
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

  const { searchTerm, minPrice, maxPrice, fromDate, toDate, ...filterData } =
    params;

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

  // numeric match
  const exactNumericFields = numericFields.filter(
    (f) => f !== "hotelRoomPriceNight"
  );

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

  // numeric match
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: exactNumericFields.map((field) => ({
        [field]: {
          equals: (filterData as any)[field],
        },
      })),
    });
  }

  const whereConditions: Prisma.HotelWhereInput = {
    AND: filters,
  };

  const result = await prisma.hotel.findMany({
    where: whereConditions,
    // include: {
    //   user: true,
    // },
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
  });

  const total = await prisma.hotel.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get all hotel rooms with search filtering and pagination
const getAllHotelRooms = async (
  params: IHotelFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, minPrice, maxPrice, fromDate, toDate, ...filterData } =
    params;

  const filters: Prisma.RoomWhereInput[] = [];

  // text search
  filters.push({
    OR: searchableFields.map((field) => {
      if (field === "hotelName") {
        // search inside related Hotel
        return {
          hotel: {
            hotelName: {
              contains: params.searchTerm,
              mode: "insensitive",
            },
          },
        };
      }
      return {
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      };
    }),
  });

  // numeric match
  const exactNumericFields = numericFields.filter(
    (f) => f !== "hotelRoomPriceNight"
  );

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData)
        .filter(
          (key) =>
            exactNumericFields.includes(key) || !numericFields.includes(key)
        )
        .map((key) => {
          let value: any = (filterData as any)[key];

          if (exactNumericFields.includes(key)) value = Number(value);
          if (["true", "false"].includes(value)) value = value === "true";

          return {
            [key]: { equals: value },
          };
        }),
    });
  }

  // price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: any = {};
    if (minPrice !== undefined) priceFilter.gte = parseFloat(minPrice as any);
    if (maxPrice !== undefined) priceFilter.lte = parseFloat(maxPrice as any);

    filters.push({
      hotelRoomPriceNight: priceFilter,
    });
  }

  // Availability filter
  if (fromDate && toDate) {
    filters.push({
      hotel_bookings: {
        none: {
          bookingStatus: BookingStatus.CONFIRMED,
          OR: [
            {
              bookedFromDate: { lte: toDate },
              bookedToDate: { gte: fromDate },
            },
          ],
        },
      },
    });
  }

  // get only isBooked  AVAILABLE hotels
  // filters.push({
  //   isBooked: EveryServiceStatus.AVAILABLE,
  // });

  const where: Prisma.RoomWhereInput = { AND: filters };

  const result = await prisma.room.findMany({
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
          profileImage: true,
        },
      },
      hotel_bookings: {
        select: {
          bookedFromDate: true,
          bookedToDate: true,
          bookingStatus: true,
        },
      },
      hotel: true,
    },
  });

  const total = await prisma.room.count({ where });

  const sortedResult = result.sort(
    (a, b) => parseFloat(b.hotelRating) - parseFloat(a.hotelRating)
  );

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: sortedResult,
  };
};

// get all my hotels for partner
const getAllHotelsForPartner = async (
  partnerId: string,
  params: IHotelFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);
  const { searchTerm, ...filterData } = params;

  const filters: Prisma.HotelWhereInput[] = [];

  // Partner filter
  filters.push({ partnerId });

  // Text search
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

  // Exact match filters
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

  const hotels = await prisma.hotel.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  const total = await prisma.hotel.count({ where });

  // total rooms in each hotel
  const roomCounts = await prisma.room.groupBy({
    by: ["hotelId"],
    _count: { hotelId: true },
    where: {
      hotelId: { in: hotels.map((h) => h.id) },
    },
  });

  // merge room count into hotel result
  const hotelsWithRoomCount = hotels.map((hotel) => {
    const countObj = roomCounts.find((r) => r.hotelId === hotel.id);
    return {
      ...hotel,
      totalRooms: countObj?._count.hotelId || 0,
    };
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: hotelsWithRoomCount,
  };
};

// get all my hotel rooms for partner
const getAllHotelRoomsForPartner = async (
  hotelId: string,
  params: IHotelFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.RoomWhereInput[] = [];

  filters.push({
    hotelId,
  });

  // text search
  filters.push({
    OR: searchableFields.map((field) => {
      if (field === "hotelName") {
        // search inside related Hotel
        return {
          hotel: {
            hotelName: {
              contains: params.searchTerm,
              mode: "insensitive",
            },
          },
        };
      }
      return {
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      };
    }),
  });

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

  const where: Prisma.RoomWhereInput = { AND: filters };

  const result = await prisma.room.findMany({
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
          profileImage: true,
        },
      },
    },
  });

  const total = await prisma.room.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get single hotel
const getSingleHotel = async (hotelId: string) => {
  const result = await prisma.hotel.findUnique({
    where: { id: hotelId },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  return result;
};

// get single hotel room
const getSingleHotelRoom = async (roomId: string) => {
  const result = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
  }

  return result;
};
// get popular hotels
const getPopularHotels = async (
  params: IHotelFilterRequest,
  options: IPaginationOptions
): Promise<Room[]> => {
  const { searchTerm, ...filterData } = params;

  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const filters: Prisma.RoomWhereInput[] = [];

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

  const where: Prisma.RoomWhereInput = {
    AND: filters,
    // hotelRating: {
    //   not: null,
    // },
  };

  const rooms = await prisma.room.findMany({
    where,
    skip,
    take: limit,
  });

  const sortedRooms = rooms.sort(
    (a, b) => parseFloat(b.hotelRating) - parseFloat(a.hotelRating)
  );
  // .slice(0, 10);

  return sortedRooms;
};

// add favorite hotel
const toggleFavorite = async (userId: string, roomId: string) => {
  // check if user exists
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // check if room exists
  const room = await prisma.room.findUnique({
    where: {
      id: roomId,
    },
  });
  if (!room?.hotelId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_roomId: {
        userId: user.id,
        roomId: room.id,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    // update unfavorite
    await prisma.room.update({
      where: {
        id: room.id,
      },
      data: {
        isFavorite: false,
      },
    });

    return { isFavorite: false };
  } else {
    await prisma.favorite.create({
      data: {
        userId,
        roomId,
        hotelId: room.hotelId,
      },
    });

    // update isFavorite
    await prisma.room.update({
      where: {
        id: room.id,
      },
      data: {
        isFavorite: true,
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
      room: true,
    },
  });

  return favorites;
};

// update hotel
const updateHotel = async (req: Request) => {
  const hotelId = req.params.hotelId;
  const partnerId = req.user?.id;

  // check if partner exists
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // check if hotel exists and belongs to this partner
  const hotelExists = await prisma.hotel.findFirst({
    where: { id: hotelId, partnerId },
  });
  if (!hotelExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found or unauthorized");
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const hotelLogoFile = files?.businessLogo?.[0];
  const docsFiles = files?.hotelDocs || [];

  // Upload new logo if exists
  let businessLogo = hotelExists.businessLogo;
  if (hotelLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(hotelLogoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // Upload multiple docs if exists
  let hotelDocUrls = hotelExists.hotelDocs || [];
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
    hotelBookingCondition,
    hotelCancelationPolicy,
    hotelLate,
    hotelLong,
  } = req.body;

  // Update hotel
  const updatedHotel = await prisma.hotel.update({
    where: { id: hotelId },
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
      hotelBookingCondition,
      hotelCancelationPolicy,
      hotelDocs: hotelDocUrls,
      hotelLate: hotelLate ? Number(hotelLate) : undefined,
      hotelLong: hotelLong ? Number(hotelLong) : undefined,
    },
  });

  return updatedHotel;
};

// update hotel room
const updateHotelRoom = async (req: Request) => {
  const roomId = req.params.roomId;
  const partnerId = req.user?.id;

  // check partner exists
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // check room exists and belongs to this partner
  const roomExists = await prisma.room.findFirst({
    where: { id: roomId, partnerId },
  });
  if (!roomExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found or unauthorized");
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const roomImageFiles = files?.hotelRoomImages || [];
  const hotelImagesFile = files?.hotelImages || [];

  // Upload new room images if exists
  let roomImageUrls = roomExists.hotelRoomImages || [];
  if (roomImageFiles.length > 0) {
    const uploads = await Promise.all(
      roomImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    roomImageUrls = uploads.map((img) => img?.secure_url || "");
  }

  // Upload new hotel images if exists
  let hotelRoomUrls = roomExists.hotelImages || [];
  if (hotelImagesFile.length > 0) {
    const docUploads = await Promise.all(
      hotelImagesFile.map((file) => uploadFile.uploadToCloudinary(file))
    );
    hotelRoomUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    hotelRoomType,
    hotelAC,
    hotelParking,
    hoitelWifi,
    hotelBreakfast,
    hotelPool,
    hotelRating,
    hotelSmoking,
    hotelTv,
    hotelWashing,
    hotelRoomDescription,
    hotelAddress,
    hotelCity,
    hotelPostalCode,
    hotelDistrict,
    hotelCountry,
    hotelRoomCapacity,
    hotelNumberOfRooms,
    hotelNumAdults,
    hotelNumChildren,
    hotelAccommodationType,
    hotelKitchen,
    hotelRestaurant,
    hotelGym,
    hotelSpa,
    hotel24HourFrontDesk,
    hotelAirportShuttle,
    hotelNoSmokingPreference,
    hotelNoNSmoking,
    hotelPetsAllowed,
    hotelNoPetsPreferences,
    hotelPetsNotAllowed,
    hotelLocationFeatureWaterView,
    hotelLocationFeatureIsland,
    hotelCoffeeBar,
    hotelRoomPriceNight,
    category,
    discount,
    hotelReviewCount,
  } = req.body;

  // Update room
  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: {
      hotelRoomType,
      hotelAC,
      hotelParking,
      hoitelWifi,
      hotelBreakfast,
      hotelPool,
      hotelRating,
      hotelSmoking,
      hotelTv,
      hotelWashing,
      hotelRoomDescription,
      hotelAddress,
      hotelCity,
      hotelPostalCode,
      hotelDistrict,
      hotelCountry,
      hotelRoomCapacity,
      hotelNumberOfRooms,
      hotelNumAdults,
      hotelNumChildren,
      hotelAccommodationType,
      hotelKitchen,
      hotelRestaurant,
      hotelGym,
      hotelSpa,
      hotel24HourFrontDesk,
      hotelAirportShuttle,
      hotelNoSmokingPreference,
      hotelNoNSmoking,
      hotelPetsAllowed,
      hotelNoPetsPreferences,
      hotelPetsNotAllowed,
      hotelLocationFeatureWaterView,
      hotelLocationFeatureIsland,
      hotelCoffeeBar,
      hotelRoomPriceNight: hotelRoomPriceNight
        ? Number(hotelRoomPriceNight)
        : undefined,
      category,
      discount: discount ? Number(discount) : undefined,
      hotelReviewCount: hotelReviewCount ? Number(hotelReviewCount) : undefined,
      hotelRoomImages: roomImageUrls,
      hotelImages: hotelRoomUrls,
    },
  });

  return updatedRoom;
};

export const HotelService = {
  createHotel,
  createHotelRoom,
  getAllHotels,
  getAllHotelRooms,
  getAllHotelsForPartner,
  getAllHotelRoomsForPartner,
  getSingleHotel,
  getSingleHotelRoom,
  getPopularHotels,
  toggleFavorite,
  getAllFavoriteHotels,
  updateHotel,
  updateHotelRoom,
};
