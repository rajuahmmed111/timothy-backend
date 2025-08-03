import { Request } from "express";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { uploadFile } from "../../../helpars/fileUploader";

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
const getAllSecurityProtocols = async () => {
  const result = await prisma.security_Protocol.findMany({
    include: {
      partner: true,
    },
  });
  return result;
};

export const Security_ProtocolService = { createSecurityProtocol };
