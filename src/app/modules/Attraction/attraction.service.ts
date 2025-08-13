import { Request } from "express";
import { uploadFile } from "../../../helpars/fileUploader";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// create attraction
const createAttraction = async (req: Request) => {
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

  const attractionBusinessLogoFile = files?.attractionBusinessLogo?.[0];
  const attractionImageFiles = files?.attractionImages || [];
  const attractionDocsFiles = files?.attractionDocs || [];

  // Upload logo
  let attractionBusinessLogo = "https://i.ibb.co/zWxSgQL8/download.png";
  if (attractionBusinessLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(
      attractionBusinessLogoFile
    );
    attractionBusinessLogo = logoResult?.secure_url || attractionBusinessLogo;
  }

  // Upload multiple attraction images
  let attractionImages: string[] = [];
  if (attractionImageFiles.length > 0) {
    const uploads = await Promise.all(
      attractionImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    attractionImages = uploads.map((img) => img?.secure_url || "");
  }

  // Upload multiple attraction docs
  let attractionDocs: string[] = [];
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
    attractionPriceDay,
    attractionDescription,
    attractionPhone,
    attractionEmail,
    attractionAddress,
    attractionCity,
    attractionPostalCode,
    attractionDistrict,
    attractionCountry,
    attractionBookingAble,
    category,
    discount,
    attractionReviewCount,
  } = req.body;

  const attraction = await prisma.attraction.create({
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
      attractionPriceDay: parseInt(attractionPriceDay),
      attractionDescription,
      attractionPhone,
      attractionEmail,
      attractionAddress,
      attractionCity,
      attractionPostalCode,
      attractionDistrict,
      attractionCountry,
      attractionImages,
      attractionBookingAble: Array.isArray(attractionBookingAble)
        ? attractionBookingAble
        : attractionBookingAble?.split(","),
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
      attractionReviewCount: attractionReviewCount
        ? parseInt(attractionReviewCount)
        : 0,
      partnerId,
    },
  });

  return attraction;
};
export const AttractionService = {
  createAttraction,
};
