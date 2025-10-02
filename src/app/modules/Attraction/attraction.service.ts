import { Request } from "express";
import { uploadFile } from "../../../helpars/fileUploader";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { EveryServiceStatus, Prisma } from "@prisma/client";
import { searchableFields } from "./attraction.constant";
import { IAttractionFilter, ISlot } from "./attraction.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";

// create attraction without schedules
const createAttraction = async (req: Request) => {
  const partnerId = req.user?.id;

  // partner check
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");

  // service check
  if (
    partnerExists.isHotel ||
    partnerExists.isSecurity ||
    partnerExists.isCar
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can only provide one type of service. You already provide another service."
    );
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const attractionBusinessLogoFile = files?.businessLogo?.[0];
  const attractionDocsFiles = files?.attractionDocs || [];

  // Upload logo
  let businessLogo = "https://i.ibb.co/zWxSgQL8/download.png";
  if (attractionBusinessLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(
      attractionBusinessLogoFile
    );
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // Upload docs
  const attractionDocs = attractionDocsFiles.length
    ? (
        await Promise.all(
          attractionDocsFiles.map((f) => uploadFile.uploadToCloudinary(f))
        )
      ).map((img) => img?.secure_url || "")
    : [];

  const {
    attractionBusinessName,
    attractionName,
    attractionBusinessType,
    attractionRegNum,
    attractionRegDate,
    attractionPhone,
    attractionEmail,
    attractionBusinessTagline,
    attractionBusinessDescription,
    attractionBookingCondition,
    attractionCancelationPolicy,
  } = req.body;

  const attraction = await prisma.attraction.create({
    data: {
      attractionBusinessName,
      attractionName,
      attractionBusinessType,
      attractionRegNum,
      attractionRegDate,
      attractionPhone,
      attractionEmail,
      businessLogo,
      attractionBusinessTagline,
      attractionBusinessDescription,
      attractionBookingCondition,
      attractionCancelationPolicy,
      attractionDocs,
      partnerId: partnerExists.id,
    },
  });

  // update partner attraction count
  await prisma.user.update({
    where: { id: partnerExists.id },
    data: { isAttraction: true },
  });
};

// create attraction appeal
const createAttractionAppeal = async (req: Request) => {
  const partnerId = req.user?.id;
  const attractionId = req.params.attractionId;

  // partner check
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");

  // check if attraction exists
  const attractionExists = await prisma.attraction.findUnique({
    where: { id: attractionId },
  });
  if (!attractionExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const attractionImageFiles = files?.attractionImages || [];

  // Upload images
  const attractionImages = attractionImageFiles.length
    ? (
        await Promise.all(
          attractionImageFiles.map((f) => uploadFile.uploadToCloudinary(f))
        )
      ).map((img) => img?.secure_url || "")
    : [];

  const {
    attractionDestinationType,
    attractionDescription,
    attractionAddress,
    attractionCity,
    attractionPostalCode,
    attractionDistrict,
    attractionCountry,
    attractionFreeWifi,
    attractionFreeParking,
    attractionKitchen,
    attractionTv,
    attractionAirConditioning,
    attractionPool,
    attractionServicesOffered,
    attractionRating,
    attractionAdultPrice,
    attractionChildPrice,
    category,
    discount,
    vat,
    attractionReviewCount,
    schedules, // [{ date: "2025-08-12", slots: [{ from, to }] }]
  } = req.body;

  // check same schedule exists
  if (!schedules || schedules.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "At least one schedule with slots is required"
    );
  }

  // for (const schedule of schedules) {
  //   const existingSchedule = await prisma.attractionSchedule.findFirst({
  //     where: {
  //       attraction: {
  //         partnerId,
  //       },
  //       // date: schedule.date,
  //       day: schedule.day,
  //     },
  //   });
  //   if (existingSchedule) {
  //     throw new ApiError(
  //       httpStatus.BAD_REQUEST,
  //       `Schedule already exists for ${schedule.date} (${schedule.day})`
  //     );
  //   }
  // }

  // appeal + schedule + slots

  const appeal = await prisma.appeal.create({
    data: {
      attractionDestinationType,
      attractionDescription,
      attractionAddress,
      attractionCity,
      attractionPostalCode,
      attractionDistrict,
      attractionCountry,
      attractionImages,
      attractionServicesOffered: Array.isArray(attractionServicesOffered)
        ? attractionServicesOffered
        : attractionServicesOffered?.split(","),
      attractionFreeWifi,
      attractionFreeParking,
      attractionKitchen,
      attractionTv,
      attractionAirConditioning,
      attractionPool,
      attractionRating: attractionRating?.toString(),
      attractionAdultPrice,
      attractionChildPrice,
      category,
      discount,
      vat,
      attractionReviewCount,
      partnerId,
      attractionId: attractionExists.id,
    },
  });

  //  create schedules + slots
  if (!schedules || schedules.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "At least one schedule with slots is required"
    );
  }

  const scheduleData = JSON.parse(schedules);

  for (const schedule of scheduleData) {
    // date as string
    const attractionSchedule = await prisma.attractionSchedule.create({
      data: {
        appealId: appeal.id,
        day: schedule.day,
      },
    });

    // remove duplicate slots for same date
    const uniqueSlots = Array.from(
      new Map(schedule.slots.map((s: any) => [`${s.from}-${s.to}`, s])).values()
    ) as ISlot[];

    for (const slot of uniqueSlots) {
      await prisma.scheduleSlot.create({
        data: {
          appealId: appeal.id,
          attractionScheduleId: attractionSchedule.id,
          from: slot.from,
          to: slot.to,
        },
      });
    }
  }

  // for (const schedule of schedules) {
  //   // date as string
  //   const attractionSchedule = await tx.attractionSchedule.create({
  //     data: {
  //       attractionId: attraction.id,
  //       // date: schedule.date,
  //       day: schedule.day,
  //     },
  //   });

  //   // remove duplicate slots for same date
  //   const uniqueSlots = Array.from(
  //     new Map(
  //       schedule.slots.map((s: any) => [`${s.from}-${s.to}`, s])
  //     ).values()
  //   ) as ISlot[];

  //   for (const slot of uniqueSlots) {
  //     await tx.scheduleSlot.create({
  //       data: {
  //         attractionId: attraction.id,
  //         attractionScheduleId: attractionSchedule.id,
  //         from: slot.from,
  //         to: slot.to,
  //       },
  //     });
  //   }
  // }

  // update partner attraction count
  await prisma.user.update({
    where: { id: partnerExists.id },
    data: { isAttraction: true },
  });

  return await prisma.appeal.findUnique({
    where: { id: attractionId },
    include: {
      attractionSchedule: {
        include: { slots: true },
      },
    },
  });
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
  // filters.push({
  //   isBooked: EveryServiceStatus.AVAILABLE,
  // });

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
          profileImage: true,
        },
      },
      attractionSchedule: {
        include: { slots: true },
      },
    },
  });

  const total = await prisma.attraction.count({ where });

  // Step 2: Group by attractionCountry
  const grouped = result.reduce((acc, attraction) => {
    const country = attraction.attractionCountry || "Unknown";
    if (!acc[country]) {
      acc[country] = [];
    }
    acc[country].push(attraction);
    return acc;
  }, {} as Record<string, typeof result>);

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: grouped,
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
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      attractionSchedule: {
        include: { slots: true },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  }

  return result;
};

// update attraction (with consistent schedule handling)
const updateAttraction = async (req: Request) => {
  const attractionId = req.params.id;
  const partnerId = req.user?.id;

  // partner check
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // attraction check
  const attractionExists = await prisma.attraction.findUnique({
    where: { id: attractionId },
    include: { attractionSchedule: { include: { slots: true } } },
  });
  if (!attractionExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  }

  // owner check
  if (attractionExists.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update"
    );
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // file uploads
  const attractionBusinessLogoFile = files?.attractionBusinessLogo?.[0];
  const attractionImageFiles = files?.attractionImages || [];
  const attractionDocsFiles = files?.attractionDocs || [];

  let attractionBusinessLogo = attractionExists.attractionBusinessLogo;
  if (attractionBusinessLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(
      attractionBusinessLogoFile
    );
    attractionBusinessLogo = logoResult?.secure_url || attractionBusinessLogo;
  }

  let attractionImages: string[] = attractionExists.attractionImages || [];
  if (attractionImageFiles.length > 0) {
    const uploads = await Promise.all(
      attractionImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    attractionImages = uploads.map((img) => img?.secure_url || "");
  }

  let attractionDocs: string[] = attractionExists.attractionDocs || [];
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
    attractionAdultPrice,
    attractionChildPrice,
    attractionDescription,
    attractionPhone,
    attractionEmail,
    attractionAddress,
    attractionCity,
    attractionPostalCode,
    attractionDistrict,
    attractionCountry,
    category,
    discount,
    attractionReviewCount,
    schedules, // comes as JSON string just like create
  } = req.body;

  // update attraction
  const updatedAttraction = await prisma.attraction.update({
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
      attractionAdultPrice: parseInt(attractionAdultPrice),
      attractionChildPrice: parseInt(attractionChildPrice),
      attractionDescription,
      attractionPhone,
      attractionEmail,
      attractionAddress,
      attractionCity,
      attractionPostalCode,
      attractionDistrict,
      attractionCountry,
      attractionImages,
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
      attractionReviewCount: attractionReviewCount
        ? parseInt(attractionReviewCount)
        : 0,
    },
  });

  // update schedules & slots if provided
  if (schedules && schedules.length > 0) {
    // parse schedules same as create
    const scheduleData = JSON.parse(schedules);

    // delete old slots
    await prisma.scheduleSlot.deleteMany({
      where: {
        attractionScheduleId: {
          in: attractionExists.attractionSchedule.map((s) => s.id),
        },
      },
    });

    // delete old schedules
    await prisma.attractionSchedule.deleteMany({
      where: { attractionId },
    });

    // create new schedules & slots
    for (const schedule of scheduleData) {
      const attractionSchedule = await prisma.attractionSchedule.create({
        data: {
          attractionId: updatedAttraction.id,
          // date: schedule.date,
          day: schedule.day,
        },
      });

      const uniqueSlots = Array.from(
        new Map(
          (schedule.slots ?? []).map((s: any) => [`${s.from}-${s.to}`, s])
        ).values()
      ) as { from: string; to: string }[];

      for (const slot of uniqueSlots) {
        await prisma.scheduleSlot.create({
          data: {
            attractionId: updatedAttraction.id,
            attractionScheduleId: attractionSchedule.id,
            from: slot.from,
            to: slot.to,
          },
        });
      }
    }
  }

  // final fetch
  return await prisma.attraction.findUnique({
    where: { id: updatedAttraction.id },
    include: {
      attractionSchedule: {
        include: { slots: true },
      },
    },
  });
};

export const AttractionService = {
  createAttraction,
  createAttractionAppeal,
  getAllAttractions,
  getAllAttractionsForPartner,
  getSingleAttraction,
  updateAttraction,
};
