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

// // create security protocol
// const createSecurityProtocol = async (req: Request) => {
//   const partnerId = req.user?.id;

//   const findPartner = await prisma.user.findUnique({
//     where: { id: partnerId },
//   });
//   if (!findPartner) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
//   }

//   const files = req.files as {
//     [fieldname: string]: Express.Multer.File[];
//   };

//   const securityFiles = files?.securityImages || [];
//   const docsFiles = files?.securityDocs || [];

//   // upload securityImages
//   const securityImageUrls = await Promise.all(
//     securityFiles.map((file) =>
//       uploadFile.uploadToCloudinary(file).then((res) => res?.secure_url || "")
//     )
//   );

//   // upload securityDocs
//   const securityDocUrls = await Promise.all(
//     docsFiles.map((file) =>
//       uploadFile.uploadToCloudinary(file).then((res) => res?.secure_url || "")
//     )
//   );

//   const {
//     securityBusinessName,
//     securityName,
//     securityBusinessType,
//     securityRegNum,
//     securityRegDate,
//     securityPhone,
//     securityEmail,
//     securityAddress,
//     securityCity,
//     securityPostalCode,
//     securityDistrict,
//     securityCountry,
//     securityDescription,
//     securityServicesOffered,
//     securityBookingCondition,
//     securityCancelationPolicy,
//     securityRating,
//     securityPriceDay,
//     category,
//     discount,
//     securityReviewCount,
//     hiredCount,
//     vat, //percentage
//     securityBookingAbleDays,
//     // schedules, // frontend expects schedules: array of { day, slots: [{ from, to }] }
//   } = req.body;

//   const parsedServices = Array.isArray(securityServicesOffered)
//     ? securityServicesOffered
//     : securityServicesOffered?.split(",").map((s: string) => s.trim());

//   // const parsedSchedules = schedules; // assuming schedules sent as JSON string

//   const securityProtocol = await prisma.security_Protocol.create({
//     data: {
//       securityBusinessName,
//       securityName,
//       securityBusinessType,
//       securityRegNum,
//       securityRegDate,
//       securityPhone,
//       securityEmail,
//       securityAddress,
//       securityCity,
//       securityPostalCode,
//       securityDistrict,
//       securityCountry,
//       securityDescription,
//       securityServicesOffered: parsedServices,
//       securityBookingCondition,
//       securityCancelationPolicy,
//       securityRating,
//       securityPriceDay: parseInt(securityPriceDay),
//       securityImages: securityImageUrls,
//       securityDocs: securityDocUrls,
//       category: category || undefined,
//       discount: discount ? parseFloat(discount) : undefined,
//       securityReviewCount: securityReviewCount
//         ? parseInt(securityReviewCount)
//         : undefined,
//       hiredCount: hiredCount ? parseInt(hiredCount) : undefined,
//       vat: vat ? parseFloat(vat) : undefined,
//       securityBookingAbleDays: Array.isArray(securityBookingAbleDays)
//         ? securityBookingAbleDays
//         : securityBookingAbleDays?.split(",") || [],
//       partnerId,
//     },
//   });

//   // update partner security count
//   await prisma.user.update({
//     where: { id: findPartner.id },
//     data: { isSecurity: true },
//   });

//   return securityProtocol;
// };

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
  filters.push({
    isBooked: EveryServiceStatus.AVAILABLE,
  });

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
  const protocolId = req.params.id;

  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const existingProtocol = await prisma.security_Protocol.findUnique({
    where: { id: protocolId, isBooked: EveryServiceStatus.AVAILABLE },
  });

  if (!existingProtocol) {
    throw new ApiError(httpStatus.NOT_FOUND, "Security protocol not found");
  }

  if (existingProtocol.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Unauthorized to update this protocol"
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const securityFiles = files?.securityImages || [];
  const docsFiles = files?.securityDocs || [];

  // Upload securityImages to Cloudinary
  let securityImageUrls: string[] = existingProtocol.securityImages || [];
  if (securityFiles.length > 0) {
    const uploads = await Promise.all(
      securityFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    securityImageUrls = uploads.map((img) => img?.secure_url || "");
  }

  // Upload securityDocs to Cloudinary
  let securityDocUrls: string[] = existingProtocol.securityDocs || [];
  if (docsFiles.length > 0) {
    const docUploads = await Promise.all(
      docsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    securityDocUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    securityBusinessName,
    securityName,
    securityBusinessType,
    securityRegNum,
    securityRegDate,
    securityPhone,
    securityEmail,
    securityAddress,
    securityCity,
    securityPostalCode,
    securityDistrict,
    securityCountry,
    securityDescription,
    securityServicesOffered,
    securityBookingCondition,
    securityCancelationPolicy,
    securityRating,
    securityPriceDay,
    category,
    discount,
    securityReviewCount,
    hiredCount,
    vat, //percentage
    securityBookingAbleDays,
  } = req.body;

  const updatedProtocol = await prisma.security_Protocol.update({
    where: { id: protocolId },
    data: {
      securityBusinessName,
      securityName,
      securityBusinessType,
      securityRegNum,
      securityRegDate,
      securityPhone,
      securityEmail,
      securityAddress,
      securityCity,
      securityPostalCode,
      securityDistrict,
      securityCountry,
      securityDescription,
      securityServicesOffered: Array.isArray(securityServicesOffered)
        ? securityServicesOffered
        : securityServicesOffered?.split(",").map((s: string) => s.trim()),
      securityBookingCondition,
      securityCancelationPolicy,
      securityRating,
      securityPriceDay: parseFloat(securityPriceDay),
      securityImages: securityImageUrls,
      securityDocs: securityDocUrls,
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
      securityReviewCount: securityReviewCount
        ? parseInt(securityReviewCount)
        : undefined,
      hiredCount: hiredCount ? parseInt(hiredCount) : undefined,
      vat: vat ? parseFloat(vat) : undefined,
      securityBookingAbleDays: Array.isArray(securityBookingAbleDays)
        ? securityBookingAbleDays
        : securityBookingAbleDays?.split(",") || [],
      partnerId,
    },
  });

  return updatedProtocol;
};

export const Security_ProtocolService = {
  createSecurityProtocol,
  getAllSecurityProtocols,
  getAllSecurityProtocolsForPartner,
  getPopularSecurityProtocols,
  getProtocolsGroupedByCategory,
  getSingleSecurityProtocol,
  updateSecurityProtocol,
};
