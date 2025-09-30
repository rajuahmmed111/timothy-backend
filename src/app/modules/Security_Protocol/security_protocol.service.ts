import { Request } from "express";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { uploadFile } from "../../../helpars/fileUploader";
import { IPaginationOptions } from "../../../interfaces/paginations";
import {
  GroupedProtocols,
  ISecurityFilterRequest,
  PopularSecurityProtocol,
} from "./security_protocol.interface";
import { EveryServiceStatus, Prisma, Security_Protocol } from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { searchableFields } from "./security_protocol.constant";

// create security protocol
const createSecurityProtocol = async (req: Request) => {
  const partnerId = req.user?.id;

  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // service check
  if (findPartner.isHotel || findPartner.isCar || findPartner.isAttraction) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can only provide one type of service. You already provide another service."
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const hotelLogoFile = files?.businessLogo?.[0];
  const docsFiles = files?.securityDocs || [];

  // Upload logo
  let businessLogo = "https://i.ibb.co/zWxSgQL8/download.png";
  if (hotelLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(hotelLogoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // upload securityDocs
  const securityDocUrls = await Promise.all(
    docsFiles.map((file) =>
      uploadFile.uploadToCloudinary(file).then((res) => res?.secure_url || "")
    )
  );

  const {
    securityBusinessName,
    securityName,
    securityBusinessType,
    securityRegNum,
    securityRegDate,
    securityPhone,
    securityEmail,
    securityTagline,
    securityProtocolDescription,
    securityProtocolType,
    securityBookingCondition,
    securityCancelationPolicy,
  } = req.body;

  const securityProtocol = await prisma.security_Protocol.create({
    data: {
      securityBusinessName,
      securityName,
      securityBusinessType,
      securityRegNum,
      securityRegDate,
      securityPhone,
      securityEmail,
      businessLogo,
      securityTagline,
      securityProtocolDescription,
      securityProtocolType,
      securityBookingCondition,
      securityCancelationPolicy,
      securityDocs: securityDocUrls,
      partnerId,
    },
  });

  // update partner security count
  await prisma.user.update({
    where: { id: findPartner.id },
    data: { isSecurity: true },
  });

  return securityProtocol;
};

// create security protocol guard type
const createSecurityProtocolGuardType = async (req: Request) => {
  const partnerId = req.user?.id;
  const securityId = req.params.securityId;

  // partner check
  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // check security protocol exists
  const findSecurityProtocol = await prisma.security_Protocol.findUnique({
    where: { id: securityId },
  });
  if (!findSecurityProtocol) {
    throw new ApiError(httpStatus.NOT_FOUND, "Security protocol not found");
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const securityFiles = files?.securityImages || [];

  // upload securityImages
  const securityImageUrls = await Promise.all(
    securityFiles.map((file) =>
      uploadFile.uploadToCloudinary(file).then((res) => res?.secure_url || "")
    )
  );

  const {
    securityGuardName,
    securityAddress,
    securityCity,
    securityPostalCode,
    securityDistrict,
    securityCountry,
    securityGuardDescription,
    securityServicesOffered,
    experience,
    availability,
    languages,
    certification,
    securityRating,
    securityPriceDay,
    category,
    discount,
    securityReviewCount,
    hiredCount,
    vat, //percentage
    securityBookingAbleDays,
  } = req.body;

  const parsedServices = Array.isArray(securityServicesOffered)
    ? securityServicesOffered
    : securityServicesOffered?.split(",").map((s: string) => s.trim());

  const securityBookingAbleDay = Array.isArray(securityBookingAbleDays)
    ? securityBookingAbleDays
    : securityBookingAbleDays?.split(",").map((s: string) => s.trim());

  const language = Array.isArray(languages)
    ? languages
    : languages?.split(",").map((s: string) => s.trim());

  const securityProtocol = await prisma.security_Guard.create({
    data: {
      securityGuardName,
      securityAddress,
      securityPostalCode,
      securityDistrict,
      securityCity,
      securityCountry,
      securityGuardDescription,
      securityServicesOffered: parsedServices,
      experience,
      availability,
      languages: language,
      certification,
      securityRating,
      securityPriceDay,
      securityImages: securityImageUrls,
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
      securityReviewCount: securityReviewCount
        ? parseInt(securityReviewCount)
        : undefined,
      hiredCount: hiredCount ? parseInt(hiredCount) : undefined,
      vat: vat ? parseFloat(vat) : undefined,
      securityBookingAbleDays: securityBookingAbleDay,
      securityId: findSecurityProtocol.id,
      partnerId: findSecurityProtocol.partnerId,
    },
  });

  return securityProtocol;
};

// get all security protocols for partner
const getAllSecurityProtocolsForPartner = async (
  partnerId: string,
  params: ISecurityFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.Security_ProtocolWhereInput[] = [];

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

  const whereConditions: Prisma.Security_ProtocolWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  const result = await prisma.security_Protocol.findMany({
    where: whereConditions,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
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

  const total = await prisma.security_Protocol.count({
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

// get all security protocols
const getAllSecurityProtocols = async (
  params: ISecurityFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.Security_ProtocolWhereInput[] = [];

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

  const where: Prisma.Security_ProtocolWhereInput = { AND: filters };

  const result = await prisma.security_Protocol.findMany({
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

  const total = await prisma.security_Protocol.count({
    where,
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

// get popular security protocols
const getPopularSecurityProtocols = async (
  params: ISecurityFilterRequest
): Promise<PopularSecurityProtocol[]> => {
  const { searchTerm, ...filterData } = params;

  const filters: Prisma.Security_ProtocolWhereInput[] = [];

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

  const where: Prisma.Security_ProtocolWhereInput = {
    AND: filters,
    // hotelRating: {
    //   not: null,
    // },
  };

  // get only isBooked  AVAILABLE hotels
  filters.push({
    isBooked: EveryServiceStatus.AVAILABLE,
  });

  const result = await prisma.security_Protocol.findMany({
    where,
    orderBy: {
      securityRating: "desc",
    },
    take: 10,
    select: {
      id: true,
      securityBusinessName: true,
      securityName: true,
      securityBusinessType: true,
      securityRegNum: true,
      securityRegDate: true,
      securityPhone: true,
      securityEmail: true,
      securityAddress: true,
      securityCity: true,
      securityPostalCode: true,
      securityDistrict: true,
      securityCountry: true,
      securityDescription: true,
      securityImages: true,
      securityServicesOffered: true,
      securityBookingCondition: true,
      securityCancelationPolicy: true,
      securityDocs: true,
      securityRating: true,
      securityPriceDay: true,
      discount: true,
      securityReviewCount: true,
      securityBookingAbleDays: true,
      category: true,
      isBooked: true,
      vat: true,
      hiredCount: true, // ✅ Add this
      createdAt: true,
      updatedAt: true,

      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  return result;
};

// get protocols grouped by category
const getProtocolsGroupedByCategory = async (): Promise<GroupedProtocols> => {
  const groupedData = await prisma.security_Protocol.groupBy({
    by: ["category"],
    _count: { id: true },
  });

  // fetch protocols per category
  const grouped: GroupedProtocols = {};

  for (const group of groupedData) {
    const protocols = await prisma.security_Protocol.findMany({
      where: { category: group.category },
      orderBy: { securityRating: "desc" },
    });
    const category = group.category || "Uncategorized";
    grouped[category] = protocols;
  }

  return grouped;
};

// get single security protocol
const getSingleSecurityProtocol = async (id: string) => {
  const result = await prisma.security_Protocol.findUnique({
    where: { id, isBooked: EveryServiceStatus.AVAILABLE },
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
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Security protocol not found");
  }

  return result;
};

// update security protocol
const updateSecurityProtocol = async (req: Request) => {
  const partnerId = req.user?.id;
  const securityId = req.params.securityId;

  // check partner exists
  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // check protocol exists
  const existingProtocol = await prisma.security_Protocol.findUnique({
    where: { id: securityId },
  });
  if (!existingProtocol) {
    throw new ApiError(httpStatus.NOT_FOUND, "Security protocol not found");
  }

  // check ownership
  if (existingProtocol.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not allowed to update this protocol"
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const logoFile = files?.businessLogo?.[0];
  const docsFiles = files?.securityDocs || [];

  // upload logo
  let businessLogo = existingProtocol.businessLogo;
  if (logoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(logoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // upload docs
  let securityDocUrls = existingProtocol.securityDocs || [];
  if (docsFiles.length > 0) {
    const docUploads = await Promise.all(
      docsFiles.map((file) =>
        uploadFile.uploadToCloudinary(file).then((res) => res?.secure_url || "")
      )
    );
    securityDocUrls = [...securityDocUrls, ...docUploads];
  }

  const {
    securityBusinessName,
    securityName,
    securityBusinessType,
    securityRegNum,
    securityRegDate,
    securityPhone,
    securityEmail,
    securityTagline,
    securityProtocolDescription,
    securityProtocolType,
    securityBookingCondition,
    securityCancelationPolicy,
  } = req.body;

  const updatedProtocol = await prisma.security_Protocol.update({
    where: { id: securityId },
    data: {
      securityBusinessName:
        securityBusinessName || existingProtocol.securityBusinessName,
      securityName: securityName || existingProtocol.securityName,
      securityBusinessType:
        securityBusinessType || existingProtocol.securityBusinessType,
      securityRegNum: securityRegNum || existingProtocol.securityRegNum,
      securityRegDate: securityRegDate || existingProtocol.securityRegDate,
      securityPhone: securityPhone || existingProtocol.securityPhone,
      securityEmail: securityEmail || existingProtocol.securityEmail,
      businessLogo,
      securityTagline: securityTagline ?? existingProtocol.securityTagline,
      securityProtocolDescription:
        securityProtocolDescription ??
        existingProtocol.securityProtocolDescription,
      securityProtocolType:
        securityProtocolType || existingProtocol.securityProtocolType,
      securityBookingCondition:
        securityBookingCondition || existingProtocol.securityBookingCondition,
      securityCancelationPolicy:
        securityCancelationPolicy || existingProtocol.securityCancelationPolicy,
      securityDocs: securityDocUrls,
    },
  });

  return updatedProtocol;
};

// update security protocol guard type
const updateSecurityProtocolGuardType = async (req: Request) => {
  const partnerId = req.user?.id;
  const guardId = req.params.guardId;

  // check partner
  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // check guard exists
  const existingGuard = await prisma.security_Guard.findUnique({
    where: { id: guardId },
  });
  if (!existingGuard) {
    throw new ApiError(httpStatus.NOT_FOUND, "Security guard not found");
  }

  // check ownership
  if (existingGuard.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not allowed to update this guard"
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const securityFiles = files?.securityImages || [];

  // upload images
  let securityImageUrls = existingGuard.securityImages || [];
  if (securityFiles.length > 0) {
    const uploaded = await Promise.all(
      securityFiles.map((file) =>
        uploadFile.uploadToCloudinary(file).then((res) => res?.secure_url || "")
      )
    );
    securityImageUrls = [...securityImageUrls, ...uploaded];
  }

  const {
    securityGuardName,
    securityAddress,
    securityCity,
    securityPostalCode,
    securityDistrict,
    securityCountry,
    securityGuardDescription,
    securityServicesOffered,
    experience,
    availability,
    languages,
    certification,
    securityRating,
    securityPriceDay,
    category,
    discount,
    securityReviewCount,
    hiredCount,
    vat,
    securityBookingAbleDays,
  } = req.body;

  // normalize arrays
  const parsedServices = Array.isArray(securityServicesOffered)
    ? securityServicesOffered
    : securityServicesOffered?.split(",").map((s: string) => s.trim());

  const securityBookingAbleDay = Array.isArray(securityBookingAbleDays)
    ? securityBookingAbleDays
    : securityBookingAbleDays?.split(",").map((s: string) => s.trim());

  const language = Array.isArray(languages)
    ? languages
    : languages?.split(",").map((s: string) => s.trim());

  const updatedGuard = await prisma.security_Guard.update({
    where: { id: guardId },
    data: {
      securityGuardName: securityGuardName || existingGuard.securityGuardName,
      securityAddress: securityAddress || existingGuard.securityAddress,
      securityPostalCode:
        securityPostalCode || existingGuard.securityPostalCode,
      securityDistrict: securityDistrict || existingGuard.securityDistrict,
      securityCity: securityCity || existingGuard.securityCity,
      securityCountry: securityCountry || existingGuard.securityCountry,
      securityGuardDescription:
        securityGuardDescription || existingGuard.securityGuardDescription,
      securityServicesOffered:
        parsedServices || existingGuard.securityServicesOffered,
      experience: experience ? parseInt(experience) : existingGuard.experience,
      availability: availability || existingGuard.availability,
      languages: language || existingGuard.languages,
      certification: certification || existingGuard.certification,
      securityRating: securityRating || existingGuard.securityRating,
      securityPriceDay: securityPriceDay
        ? parseFloat(securityPriceDay)
        : existingGuard.securityPriceDay,
      category: category || existingGuard.category,
      discount: discount ? parseFloat(discount) : existingGuard.discount,
      securityReviewCount: securityReviewCount
        ? parseInt(securityReviewCount)
        : existingGuard.securityReviewCount,
      hiredCount: hiredCount ? parseInt(hiredCount) : existingGuard.hiredCount,
      vat: vat ? parseFloat(vat) : existingGuard.vat,
      securityBookingAbleDays:
        securityBookingAbleDay || existingGuard.securityBookingAbleDays,
      securityImages: securityImageUrls,
    },
  });

  return updatedGuard;
};

export const Security_ProtocolService = {
  createSecurityProtocol,
  createSecurityProtocolGuardType,
  getAllSecurityProtocols,
  getAllSecurityProtocolsForPartner,
  getPopularSecurityProtocols,
  getProtocolsGroupedByCategory,
  getSingleSecurityProtocol,
  updateSecurityProtocol,
  updateSecurityProtocolGuardType,
};
