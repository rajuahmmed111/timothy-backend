import { Request } from "express";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { uploadFile } from "../../../helpars/fileUploader";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { ISecurityFilterRequest } from "./security_protocol.interface";
import { Prisma } from "@prisma/client";
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

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const securityFiles = files?.securityImages || [];
  const docsFiles = files?.securityDocs || [];

  // Upload multiple security images
  let securityImageUrls: string[] = [];
  if (securityFiles.length > 0) {
    const uploads = await Promise.all(
      securityFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    securityImageUrls = uploads.map((img) => img?.secure_url || "");
  }

  // Upload multiple docs
  let securityDocUrls: string[] = [];
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
    securityServicesOffered, // comma-separated string or array
    securityBookingCondition,
    securityCancelationPolicy,
    securityRating,
    securityPriceDay,
    category,
    discount,
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
      securityPriceDay: parseFloat(securityPriceDay),
      securityImages: securityImageUrls,
      securityDocs: securityDocUrls,
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
      partnerId,
    },
  });

  return securityProtocol;
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
  //   filters.push({
  //     isBooked: HotelRoomStatus.AVAILABLE,
  //   });

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
      user: true,
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
    where: { id: protocolId },
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
    },
  });

  return updatedProtocol;
};

export const Security_ProtocolService = {
  createSecurityProtocol,
  getAllSecurityProtocols,
  updateSecurityProtocol,
};
