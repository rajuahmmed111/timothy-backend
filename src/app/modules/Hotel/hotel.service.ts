import { Request } from "express";
import prisma from "../../../shared/prisma";
import { IUploadedFile } from "../../../interfaces/file";
import { uploadFile } from "../../../helpars/fileUploader";

// create hotel
const createHotel = async (req: Request) => {
  const partnerId = req.user?.id;

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const hotelLogoFile = files?.hotelLogo?.[0];
  const roomImageFiles = files?.hotelRoomImages || [];
  const docsFiles = files?.hotelDocs || [];

  // Upload logo
  let businessLogo = "https://i.ibb.co/zWxSgQL8/download.png";
  if (hotelLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(hotelLogoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // Upload multiple room images
  let roomImageUrls: string[] = [];
  if (roomImageFiles.length > 0) {
    const uploads = await Promise.all(
      roomImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    roomImageUrls = uploads.map((img) => img?.secure_url || "");
  }

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
    hotelRoomType,
    hotelRoomPriceNight,
    hotelAC,
    hotelParking,
    hoitelWifi,
    hotelBreakfast,
    hotelPool,
    hotelRating,
    hotelSmoking,
    hotelTv,
    hotelWashing,
    hotelBookingCondition,
    hotelCancelationPolicy,
    hotelDocs,
    hotelRoomDescription,
    hotelAddress,
    hotelCity,
    hotelPostalCode,
    hotelDistrict,
    hotelCountry,
    category,
    discount,
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
      hotelRoomType,
      hotelRoomPriceNight: parseInt(hotelRoomPriceNight),
      hotelAC: hotelAC === "true",
      hotelParking: hotelParking === "true",
      hoitelWifi: hoitelWifi === "true",
      hotelBreakfast: hotelBreakfast === "true",
      hotelPool: hotelPool === "true",
      hotelRating,
      hotelSmoking: hotelSmoking === "true",
      hotelTv: hotelTv === "true",
      hotelWashing: hotelWashing === "true",
      hotelBookingCondition,
      hotelCancelationPolicy,
      hotelDocs : hotelDocUrls,
      hotelRoomDescription,
      hotelAddress,
      hotelCity,
      hotelPostalCode,
      hotelDistrict,
      hotelCountry,
      hotelRoomImages: roomImageUrls,
      category: category || undefined,
      discount: discount ? parseFloat(discount) : undefined,
      userId: partnerId,
    },
  });

  return result;
};

export const HotelService = { createHotel };
