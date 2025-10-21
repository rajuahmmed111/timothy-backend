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
import {
  BookingStatus,
  EveryServiceStatus,
  Prisma,
  Security_Protocol,
} from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import {
  protocolSearchFields,
  searchableFields,
} from "./security_protocol.constant";

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
      experience: parseInt(experience),
      availability,
      languages: language,
      certification,
      securityRating: securityRating ? securityRating : "0",
      securityPriceDay: parseFloat(securityPriceDay),
      securityImages: securityImageUrls,
      category: category || undefined,
      discount: discount ? parseFloat(discount) : 0,
      securityReviewCount: securityReviewCount
        ? parseInt(securityReviewCount)
        : 0,
      hiredCount: hiredCount ? parseInt(hiredCount) : 0,
      securityBookingAbleDays: securityBookingAbleDay,
      securityId: findSecurityProtocol.id,
      partnerId: findSecurityProtocol.partnerId,
    },
  });

  return securityProtocol;
};

// get all security guards active listing by partnerId
const getAllActiveListingSecurityGuardsByPartnerId = async (
  partnerId: string,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const result = await prisma.security_Guard.findMany({
    where: {
      partnerId,
    },
    skip,
    take: limit,
    orderBy: {
      createdAt: "asc",
    },
  });

  const total = await prisma.security_Guard.count({
    where: {
      partnerId,
    },
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

// get all security guards available by partnerId
const getAllAvailableListingSecurityGuardsByPartnerId = async (
  partnerId: string,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const result = await prisma.security_Guard.findMany({
    where: {
      partnerId,
      isBooked: EveryServiceStatus.AVAILABLE,
    },
    skip,
    take: limit,
    orderBy: {
      createdAt: "asc",
    },
  });

  const total = await prisma.security_Guard.count({
    where: {
      partnerId,
    },
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

// get all my security protocols for partner
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

  // total security protocols guards type in security protocols
  const totalGuardsSpecificSecurity = await prisma.security_Guard.groupBy({
    by: ["securityId"],
    _count: {
      securityId: true,
    },
    where: {
      securityId: {
        in: result.map((securityProtocol) => securityProtocol.id),
      },
    },
  });

  // merge guards into security protocols result
  const mergedSecurityProtocols = result.map((security) => {
    const countObj = totalGuardsSpecificSecurity.find(
      (r) => r.securityId === security.id
    );
    return {
      ...security,
      totalGuards: countObj?._count.securityId || 0,
    };
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: mergedSecurityProtocols,
  };
};

// get all security protocols security guards for partner
const getAllSecurityProtocolsForPartnerSecurityGuards = async (
  securityId: string,
  params: ISecurityFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.Security_GuardWhereInput[] = [];

  filters.push({
    securityId,
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

  const where: Prisma.Security_GuardWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  const result = await prisma.security_Guard.findMany({
    where: where,
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

  const total = await prisma.security_Guard.count({
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

// get all security protocols
const getAllSecurityProtocols = async (
  params: ISecurityFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.Security_ProtocolWhereInput[] = [];

  // text search
  if (searchTerm) {
    filters.push({
      OR: [
        // search in Security_Protocol fields
        ...protocolSearchFields.map((field) => ({
          [field]: {
            contains: searchTerm,
            mode: "insensitive",
          },
        })),

        // search in Security_Guard relation fields
        ...searchableFields.map((field) => ({
          security_Guard: {
            some: {
              [field]: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        })),
      ],
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

  // fromDate - toDate booking exclude
  if (filterData.fromDate && filterData.toDate) {
    filters.push({
      security_Booking: {
        none: {
          AND: [
            {
              securityBookedFromDate: { lte: filterData.toDate },
            },
            {
              securityBookedToDate: { gte: filterData.fromDate },
            },
            {
              bookingStatus: { not: BookingStatus.COMPLETED },
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
      security_Guard: true,
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

// get all security protocols with guards
// const getAllSecurityProtocolsGuards = async (
//   params: ISecurityFilterRequest,
//   options: IPaginationOptions
// ) => {
//   const { limit, page, skip } = paginationHelpers.calculatedPagination(options);
//   const { searchTerm, fromDate, toDate, securityProtocolType, ...filterData } =
//     params;

//   // exact search filter
//   const protocols = await prisma.security_Protocol.findMany({
//     where: securityProtocolType
//       ? { securityProtocolType: { equals: securityProtocolType } }
//       : {},

//     select: {
//       id: true,
//       securityName: true,
//       securityProtocolType: true,
//     },
//   });

//   //  get all security protocols
//   const data = await Promise.all(
//     protocols.map(async (protocol) => {
//       const filters: Prisma.Security_GuardWhereInput[] = [];

//       // text search
//       if (searchTerm) {
//         filters.push({
//           OR: [
//             ...searchableFields.map((field) => ({
//               [field]: {
//                 contains: searchTerm,
//                 mode: "insensitive",
//               },
//             })),
//           ],
//         });
//       }

//       // Exact filters (for guard fields)
//       if (Object.keys(filterData).length > 0) {
//         filters.push({
//           AND: Object.keys(filterData).map((key) => ({
//             [key]: { equals: (filterData as any)[key] },
//           })),
//         });
//       }

//       // fromDate - toDate booking exclude
//       if (fromDate && toDate) {
//         filters.push({
//           security_Booking: {
//             none: {
//               AND: [
//                 { securityBookedFromDate: { lte: toDate } },
//                 { securityBookedToDate: { gte: fromDate } },
//                 { bookingStatus: { not: BookingStatus.COMPLETED } },
//               ],
//             },
//           },
//         });
//       }

//       // get only isBooked  AVAILABLE hotels
//       filters.push({
//         securityId: protocol.id,
//       });

//       const where: Prisma.Security_GuardWhereInput = { AND: filters };

//       const guards = await prisma.security_Guard.findMany({
//         where,
//         skip,
//         take: limit,
//         orderBy:
//           options.sortBy && options.sortOrder
//             ? { [options.sortBy]: options.sortOrder }
//             : { securityRating: "desc" },
//         include: {
//           user: {
//             select: { id: true, fullName: true, profileImage: true },
//           },
//           security: {
//             select: {
//               id: true,
//               securityName: true,
//               securityProtocolType: true,
//             },
//           },
//         },
//       });

//       const totalGuards = await prisma.security_Guard.count({ where });

//       return {
//         protocolId: protocol.id,
//         protocolName: protocol.securityName,
//         protocolType: protocol.securityProtocolType,
//         meta: {
//           total: totalGuards,
//           page,
//           limit,
//         },
//         guards,
//       };
//     })
//   );

//   return data;
// };
const getAllSecurityProtocolsGuards = async (
  params: ISecurityFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);
  const { searchTerm, fromDate, toDate, securityProtocolType, ...filterData } =
    params;

  const filters: Prisma.Security_GuardWhereInput[] = [];

  // Text search
  if (searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
      })),
    });
  }

  // Protocol type filter
  if (securityProtocolType) {
    filters.push({
      security: { securityProtocolType: { equals: securityProtocolType } },
    });
  }

  // Date availability filter
  if (fromDate && toDate) {
    filters.push({
      security_Booking: {
        none: {
          AND: [
            { securityBookedFromDate: { lte: toDate } },
            { securityBookedToDate: { gte: fromDate } },
            { bookingStatus: { not: BookingStatus.COMPLETED } },
          ],
        },
      },
    });
  }

  // Exact filters
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const where: Prisma.Security_GuardWhereInput = { AND: filters };

  // Single query with pagination
  const [guards, total] = await Promise.all([
    prisma.security_Guard.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        options.sortBy && options.sortOrder
          ? { [options.sortBy]: options.sortOrder }
          : { securityRating: "desc" },
      include: {
        user: {
          select: { id: true, fullName: true, profileImage: true },
        },
        security: {
          select: {
            id: true,
            securityName: true,
            securityProtocolType: true,
          },
        },
      },
    }),
    prisma.security_Guard.count({ where }),
  ]);

  return {
    meta: { total, page, limit },
    data: guards,
  };
};

// get all security protocols guards by security protocol id
const getAllSecurityProtocolsGuardsBySecurityProtocolId = async (
  params: ISecurityFilterRequest,
  options: IPaginationOptions,
  securityId: string
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);
  const { searchTerm, fromDate, toDate, securityProtocolType, ...filterData } =
    params;

  const filters: Prisma.Security_GuardWhereInput[] = [];

  filters.push({
    securityId,
  });

  // Text search
  if (searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
      })),
    });
  }

  // Protocol type filter
  if (securityProtocolType) {
    filters.push({
      security: { securityProtocolType: { equals: securityProtocolType } },
    });
  }

  // Date availability filter
  if (fromDate && toDate) {
    filters.push({
      security_Booking: {
        none: {
          AND: [
            { securityBookedFromDate: { lte: toDate } },
            { securityBookedToDate: { gte: fromDate } },
            { bookingStatus: { not: BookingStatus.COMPLETED } },
          ],
        },
      },
    });
  }

  // Exact filters
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const where: Prisma.Security_GuardWhereInput = { AND: filters };

  // Single query with pagination
  const [guards, total] = await Promise.all([
    prisma.security_Guard.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        options.sortBy && options.sortOrder
          ? { [options.sortBy]: options.sortOrder }
          : { securityRating: "desc" },
      include: {
        user: {
          select: { id: true, fullName: true, profileImage: true },
        },
        security: {
          select: {
            id: true,
            securityName: true,
            securityProtocolType: true,
          },
        },
      },
    }),
    prisma.security_Guard.count({ where }),
  ]);

  return {
    meta: { total, page, limit },
    data: guards,
  };
};

// get all security protocols security guard app
const getAllSecurityProtocolsGuardsApp = async (
  params: ISecurityFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.Security_GuardWhereInput[] = [];

  // get all security protocols
  const getAllSecurityProtocol = await prisma.security_Protocol.findMany({
    select: {
      id: true,
      securityProtocolType: true,
    },
  });

  // text search
  filters.push({
    OR: searchableFields.map((field) => {
      if (field === "securityName") {
        // search inside related security protocol
        return {
          security: {
            securityName: {
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

  // // Exact search filter
  // if (Object.keys(filterData).length > 0) {
  //   filters.push({
  //     AND: Object.keys(filterData).map((key) => ({
  //       [key]: {
  //         equals: (filterData as any)[key],
  //       },
  //     })),
  //   });
  // }

  // Exact filter for securityProtocolType (relation)
  if (params.securityProtocolType) {
    filters.push({
      security: {
        securityProtocolType: {
          equals: params.securityProtocolType,
          mode: "insensitive",
        },
      },
    });
  }

  // fromDate - toDate booking exclude
  if (filterData.fromDate && filterData.toDate) {
    filters.push({
      security_Booking: {
        none: {
          AND: [
            {
              securityBookedFromDate: { lte: filterData.toDate },
            },
            {
              securityBookedToDate: { gte: filterData.fromDate },
            },
            {
              bookingStatus: { not: BookingStatus.COMPLETED },
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

  const where: Prisma.Security_GuardWhereInput = { AND: filters };

  const result = await prisma.security_Guard.findMany({
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
      security: {
        select: {
          id: true,
          securityName: true,
          securityProtocolType: true,
        },
      },
    },
  });

  const total = await prisma.security_Guard.count({
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
const getPopularSecurityProtocols = async (params: ISecurityFilterRequest) => {
  const { searchTerm, ...filterData } = params;

  const filters: Prisma.Security_GuardWhereInput[] = [];

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

  const where: Prisma.Security_GuardWhereInput = {
    AND: filters,
    // hotelRating: {
    //   not: null,
    // },
  };

  // get only isBooked  AVAILABLE hotels
  // filters.push({
  //   isBooked: EveryServiceStatus.AVAILABLE,
  // });

  const result = await prisma.security_Guard.findMany({
    where,
    orderBy: {
      securityRating: "desc",
    },
    take: 10,
  });

  return result;
};

// get single security protocol security guard
const getSingleSecurityProtocolGuard = async (guardId: string) => {
  const result = await prisma.security_Guard.findUnique({
    where: { id: guardId },
    include: {
      security: {
        select: {
          id: true,
          securityName: true,
          securityProtocolType: true,
        },
      },
    },
  });
  return result;
};

// get protocols grouped by category
const getProtocolsGroupedByCategory = async (): Promise<GroupedProtocols> => {
  const groupedData = await prisma.security_Guard.groupBy({
    by: ["category"],
    _count: { id: true },
  });

  // fetch protocols per category
  const grouped: GroupedProtocols = {};

  for (const group of groupedData) {
    const protocols = await prisma.security_Guard.findMany({
      where: { category: group.category },
      orderBy: { securityRating: "desc" },
    });
    const category = group.category || "Uncategorized";
    grouped[category] = protocols;
  }

  return grouped;
};

// get popular security guards by rating
const getPopularSecurityGuards = async () => {
  const result = await prisma.security_Guard.findMany({
    orderBy: { securityRating: "desc" },
    take: 10,
  });
  return result;
};

// get single security protocol
const getSingleSecurityProtocol = async (id: string) => {
  const result = await prisma.security_Protocol.findUnique({
    where: { id },
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
      securityBookingAbleDays:
        securityBookingAbleDay || existingGuard.securityBookingAbleDays,
      securityImages: securityImageUrls,
    },
  });

  return updatedGuard;
};

// delete security protocol
const deleteSecurityProtocol = async (
  securityId: string,
  partnerId: string
) => {
  // check security protocol exists
  const findSecurityProtocol = await prisma.security_Protocol.findUnique({
    where: { id: securityId },
  });
  if (!findSecurityProtocol) {
    throw new ApiError(httpStatus.NOT_FOUND, "Security protocol not found");
  }

  // check partner
  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // delete security protocol
  return await prisma.security_Protocol.delete({
    where: { id: securityId, partnerId },
  });
};

// delete security protocol guard
const deleteSecurityProtocolGuard = async (
  guardId: string,
  partnerId: string
) => {
  // check guard exists
  const findGuard = await prisma.security_Guard.findUnique({
    where: { id: guardId },
  });
  if (!findGuard) {
    throw new ApiError(httpStatus.NOT_FOUND, "Guard not found");
  }

  // check partner
  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // delete security protocol guard type
  return await prisma.security_Guard.delete({
    where: { id: guardId },
  });
};

export const Security_ProtocolService = {
  createSecurityProtocol,
  createSecurityProtocolGuardType,
  getAllActiveListingSecurityGuardsByPartnerId,
  getAllAvailableListingSecurityGuardsByPartnerId,
  getAllSecurityProtocols,
  getAllSecurityProtocolsGuardsApp,
  getAllSecurityProtocolsGuards,
  getAllSecurityProtocolsGuardsBySecurityProtocolId,
  getAllSecurityProtocolsForPartner,
  getAllSecurityProtocolsForPartnerSecurityGuards,
  getPopularSecurityProtocols,
  getProtocolsGroupedByCategory,
  getPopularSecurityGuards,
  getSingleSecurityProtocol,
  getSingleSecurityProtocolGuard,
  updateSecurityProtocol,
  updateSecurityProtocolGuardType,
  deleteSecurityProtocol,
  deleteSecurityProtocolGuard,
};
