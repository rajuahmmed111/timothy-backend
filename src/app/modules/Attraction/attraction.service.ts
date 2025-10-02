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

  return attraction;
};

// create attraction appeal with schedules
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
    schedules, // [{ day, slots:[{from,to}] }]
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

// get all attractions appeals
const getAllAttractionsAppeals = async (
  params: IAttractionFilter,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.AppealWhereInput[] = [];

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

  const where: Prisma.AppealWhereInput = { AND: filters };

  const result = await prisma.appeal.findMany({
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

  const total = await prisma.appeal.count({ where });

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

// get all attractions appeals for partner
const getAllAttractionsAppealsForPartner = async (
  attractionId: string,
  params: IAttractionFilter,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.AppealWhereInput[] = [];

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
    attractionId,
  });

  const where: Prisma.AppealWhereInput = { AND: filters };

  const result = await prisma.appeal.findMany({
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
  const total = await prisma.appeal.count({ where });

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
const getSingleAttraction = async (attractionId: string) => {
  const result = await prisma.attraction.findUnique({
    where: { id: attractionId },
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

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  }

  return result;
};

// get single attraction appeal
const getSingleAttractionAppeal = async (appealId: string) => {
  const result = await prisma.appeal.findUnique({
    where: { id: appealId },
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

// update attraction
const updateAttraction = async (req: Request) => {
  const partnerId = req.user?.id;
  const attractionId = req.params.attractionId;

  // partner check
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // check attraction exists
  const attractionExists = await prisma.attraction.findUnique({
    where: { id: attractionId },
  });
  if (!attractionExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // Upload new logo (if provided)
  let businessLogo = attractionExists.businessLogo;
  const attractionBusinessLogoFile = files?.attractionBusinessLogo?.[0];
  if (attractionBusinessLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(
      attractionBusinessLogoFile
    );
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // Upload new docs (if provided)
  let attractionDocs = attractionExists.attractionDocs;
  const attractionDocsFiles = files?.attractionDocs || [];
  if (attractionDocsFiles.length) {
    attractionDocs = (
      await Promise.all(
        attractionDocsFiles.map((f) => uploadFile.uploadToCloudinary(f))
      )
    ).map((img) => img?.secure_url || "");
  }

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

  // update attraction
  const updatedAttraction = await prisma.attraction.update({
    where: { id: attractionId },
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
    },
  });

  return updatedAttraction;
};

// update appeal with schedules
const updateAttractionAppeal = async (req: Request) => {
  const partnerId = req.user?.id;
  const appealId = req.params.appealId;

  // check partner
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");

  // check appeal exists
  const appealExists = await prisma.appeal.findUnique({
    where: { id: appealId },
  });
  if (!appealExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Appeal not found");

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const attractionImageFiles = files?.attractionImages || [];

  // upload new images
  const newImages = attractionImageFiles.length
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
    schedules, // [{ day, slots:[{from,to}] }]
  } = req.body;

  // update appeal main data
  const updatedAppeal = await prisma.appeal.update({
    where: { id: appealId },
    data: {
      attractionDestinationType,
      attractionDescription,
      attractionAddress,
      attractionCity,
      attractionPostalCode,
      attractionDistrict,
      attractionCountry,
      ...(newImages.length > 0 && { attractionImages: newImages }),
      attractionServicesOffered: Array.isArray(attractionServicesOffered)
        ? attractionServicesOffered
        : attractionServicesOffered?.split(","),
      attractionFreeWifi,
      attractionFreeParking,
      attractionKitchen,
      attractionTv,
      attractionAirConditioning,
      attractionPool,
      attractionRating: parseFloat(attractionRating),
      attractionAdultPrice: parseFloat(attractionAdultPrice),
      attractionChildPrice: parseFloat(attractionChildPrice),
      category,
      discount: parseFloat(discount),
      vat: parseFloat(vat),
      attractionReviewCount: parseInt(attractionReviewCount),
    },
  });

  // update schedules if provided
  if (schedules) {
    const scheduleData = JSON.parse(schedules);

    // delete old schedules + slots
    await prisma.scheduleSlot.deleteMany({ where: { appealId } });
    await prisma.attractionSchedule.deleteMany({ where: { appealId } });

    // insert new schedules + slots
    for (const schedule of scheduleData) {
      const attractionSchedule = await prisma.attractionSchedule.create({
        data: {
          appealId: appealId,
          day: schedule.day,
        },
      });

      // remove duplicate slots for same date
      const uniqueSlots = Array.from(
        new Map(
          schedule.slots.map((s: any) => [`${s.from}-${s.to}`, s])
        ).values()
      ) as ISlot[];

      for (const slot of uniqueSlots) {
        await prisma.scheduleSlot.create({
          data: {
            appealId: appealId,
            attractionScheduleId: attractionSchedule.id,
            from: slot.from,
            to: slot.to,
          },
        });
      }
    }
  }

  return await prisma.appeal.findUnique({
    where: { id: appealId },
    include: {
      attractionSchedule: { include: { slots: true } },
    },
  });
};

export const AttractionService = {
  createAttraction,
  createAttractionAppeal,
  getAllAttractions,
  getAllAttractionsAppeals,
  getAllAttractionsForPartner,
  getAllAttractionsAppealsForPartner,
  getSingleAttraction,
  getSingleAttractionAppeal,
  updateAttraction,
  updateAttractionAppeal,
};
