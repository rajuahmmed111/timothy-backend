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

  // upload attractionImages
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
    schedules, // [{ day, slots:[{from,to}] }]
  } = req.body;

  if (!schedules || schedules.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "At least one schedule with slots is required"
    );
  }

  // convert schedules if string
  const scheduleData =
    typeof schedules === "string" ? JSON.parse(schedules) : schedules;

  // use transaction
  const result = await prisma.$transaction(
    async (tx) => {
      // create appeal
      const appeal = await tx.appeal.create({
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
          attractionFreeWifi: Boolean(attractionFreeWifi),
          attractionFreeParking: Boolean(attractionFreeParking),
          attractionKitchen: Boolean(attractionKitchen),
          attractionTv: Boolean(attractionTv),
          attractionAirConditioning: Boolean(attractionAirConditioning),
          attractionPool: Boolean(attractionPool),
          attractionRating: attractionRating ? attractionRating : "0",
          attractionAdultPrice: parseFloat(attractionAdultPrice),
          attractionChildPrice: parseFloat(attractionChildPrice),
          category,
          discount: parseFloat(discount),
          partnerId,
          attractionId: attractionExists.id,
        },
      });

      // create schedules & slots
      for (const schedule of scheduleData) {
        // create schedule
        const attractionSchedule = await tx.attractionSchedule.create({
          data: {
            appealId: appeal.id,
            day: schedule.day,
          },
        });

        // remove duplicate slots
        const uniqueSlots = Array.from(
          new Map(
            schedule.slots.map((s: any) => [`${s.from}-${s.to}`, s])
          ).values()
        ) as ISlot[];

        // bulk insert slots
        if (uniqueSlots.length > 0) {
          await tx.scheduleSlot.createMany({
            data: uniqueSlots.map((slot: ISlot) => ({
              appealId: appeal.id,
              attractionScheduleId: attractionSchedule.id,
              from: slot.from,
              to: slot.to,
            })),
          });
        }
      }

      return appeal;
    },
    { maxWait: 15000, timeout: 30000 }
  );

  return await prisma.appeal.findUnique({
    where: { id: result.id },
    include: {
      attraction: true,
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

// get all attractions appeals by attraction id
const getAllAttractionsAppealsByAttractionId = async (
  params: IAttractionFilter,
  options: IPaginationOptions,
  attractionId: string
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.AppealWhereInput[] = [];

  // filter by attraction id
  filters.push({
    attractionId,
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

  // total appeals in each attraction
  const appealCounts = await prisma.appeal.groupBy({
    by: ["attractionId"],
    _count: { attractionId: true },
    where: {
      attractionId: { in: result.map((h) => h.id) },
    },
  });

  // merge appeal count into attraction result
  const attractionWithAppealCount = result.map((attraction) => {
    const countObj = appealCounts.find((r) => r.attractionId === attraction.id);
    return {
      ...attraction,
      totalAppeals: countObj?._count.attractionId || 0,
    };
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: attractionWithAppealCount,
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

// update attraction appeal with schedules
const updateAttractionAppeal = async (req: Request) => {
  const partnerId = req.user?.id;
  const appealId = req.params.appealId;

  // partner check
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");

  // check if appeal exists
  const appealExists = await prisma.appeal.findUnique({
    where: { id: appealId },
    include: { attractionSchedule: { include: { slots: true } } },
  });
  if (!appealExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Appeal not found");

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const attractionImageFiles = files?.attractionImages || [];

  // upload new images if any
  const newAttractionImages = attractionImageFiles.length
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
    schedules, // [{ day, slots:[{from,to}] }]
  } = req.body;

  // convert schedules if string
  const scheduleData =
    typeof schedules === "string" ? JSON.parse(schedules) : schedules;

  // transaction for safety
  const updatedAppeal = await prisma.$transaction(
    async (tx) => {
      // update appeal info
      const appeal = await tx.appeal.update({
        where: { id: appealId },
        data: {
          attractionDestinationType,
          attractionDescription,
          attractionAddress,
          attractionCity,
          attractionPostalCode,
          attractionDistrict,
          attractionCountry,
          attractionImages: newAttractionImages.length
            ? newAttractionImages
            : appealExists.attractionImages,
          attractionServicesOffered: Array.isArray(attractionServicesOffered)
            ? attractionServicesOffered
            : attractionServicesOffered?.split(","),
          attractionFreeWifi: Boolean(attractionFreeWifi),
          attractionFreeParking: Boolean(attractionFreeParking),
          attractionKitchen: Boolean(attractionKitchen),
          attractionTv: Boolean(attractionTv),
          attractionAirConditioning: Boolean(attractionAirConditioning),
          attractionPool: Boolean(attractionPool),
          attractionRating,
          attractionAdultPrice: parseFloat(attractionAdultPrice),
          attractionChildPrice: parseFloat(attractionChildPrice),
          category,
          discount: parseFloat(discount),
        },
      });

      // delete old schedules and slots
      await tx.scheduleSlot.deleteMany({ where: { appealId } });
      await tx.attractionSchedule.deleteMany({ where: { appealId } });

      // re-insert schedules & slots
      for (const schedule of scheduleData || []) {
        const attractionSchedule = await tx.attractionSchedule.create({
          data: {
            appealId: appeal.id,
            day: schedule.day,
          },
        });

        const uniqueSlots = Array.from(
          new Map(
            schedule.slots.map((s: any) => [`${s.from}-${s.to}`, s])
          ).values()
        ) as ISlot[];

        if (uniqueSlots.length > 0) {
          await tx.scheduleSlot.createMany({
            data: uniqueSlots.map((slot: ISlot) => ({
              appealId: appeal.id,
              attractionScheduleId: attractionSchedule.id,
              from: slot.from,
              to: slot.to,
            })),
          });
        }
      }

      return appeal;
    },
    { maxWait: 15000, timeout: 30000 }
  );

  return await prisma.appeal.findUnique({
    where: { id: updatedAppeal.id },
    include: {
      attraction: true,
      attractionSchedule: {
        include: { slots: true },
      },
    },
  });
};

// delete attraction
const deleteAttraction = async (attractionId: string, partnerId: string) => {
  // check if attraction exists
  const attractionExists = await prisma.attraction.findUnique({
    where: { id: attractionId },
  });
  if (!attractionExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");

  // partner check
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");

  // delete attraction
  return await prisma.attraction.delete({
    where: { id: attractionId, partnerId },
  });
};

// delete appeal
const deleteAttractionAppeal = async (appealId: string, partnerId: string) => {
  // check if appeal exists
  const appealExists = await prisma.appeal.findUnique({
    where: { id: appealId },
  });
  if (!appealExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Appeal not found");

  // partner check
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists)
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");

  // delete appeal
  return await prisma.appeal.delete({
    where: { id: appealId, partnerId },
  });
};

export const AttractionService = {
  createAttraction,
  createAttractionAppeal,
  getAllAttractions,
  getAllAttractionsAppeals,
  getAllAttractionsAppealsByAttractionId,
  getAllAttractionsForPartner,
  getAllAttractionsAppealsForPartner,
  getSingleAttraction,
  getSingleAttractionAppeal,
  updateAttraction,
  updateAttractionAppeal,
  deleteAttraction,
  deleteAttractionAppeal,
};
