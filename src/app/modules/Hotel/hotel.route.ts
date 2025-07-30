import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { HotelController } from "./hotel.controller";
import { uploadFile } from "../../../helpars/fileUploader";
import { parseBodyData } from "../../middlewares/parseNestedJson";
// import validateRequest from "../../middlewares/validateRequest";

const router = express.Router();

// get all hotels
router.get(
  "/",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  HotelController.getAllHotels
);

// get popular hotels
router.get(
  "/popular",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  HotelController.getPopularHotels
);

// get single hotel
router.get(
  "/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  HotelController.getSingleHotel
);

// create hotel
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "hotelLogo", maxCount: 1 },
    { name: "hotelRoomImages", maxCount: 5 },
    { name: "hotelDocs", maxCount: 5 },
  ]),
  parseBodyData,
  //   validateRequest(HotelController.createHotelSchema),
  HotelController.createHotel
);

// update hotel
router.patch(
  "/:id",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "hotelLogo", maxCount: 1 },
    { name: "hotelRoomImages", maxCount: 5 },
    { name: "hotelDocs", maxCount: 5 },
  ]),
  parseBodyData,
  HotelController.updateHotel
);

export const hotelRoute = router;
