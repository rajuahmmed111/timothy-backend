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
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  HotelController.getAllHotels
);

// get all hotel rooms
router.get(
  "/rooms",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  HotelController.getAllHotelRooms
);

// get all my created hotels for partner
router.get(
  "/partner",
  auth(UserRole.BUSINESS_PARTNER),
  HotelController.getAllHotelsForPartner
);

// get my favorites
router.get(
  "/my-favorites",
  auth(UserRole.USER),
  HotelController.getAllFavoriteHotels
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
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  HotelController.getSingleHotel
);

// get single hotel room
router.get(
  "/room/:roomId",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  HotelController.getSingleHotelRoom
);

// add favorite hotel room
router.post(
  "/favorite/:roomId",
  auth(UserRole.USER),
  HotelController.toggleFavorite
);

// create hotel
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "hotelDocs", maxCount: 5 },
  ]),
  parseBodyData,
  //   validateRequest(HotelController.createHotelSchema),
  HotelController.createHotel
);

// create hotel room
router.post(
  "/room/:hotelId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "hotelImages", maxCount: 5 },
    { name: "hotelRoomImages", maxCount: 5 },
  ]),
  parseBodyData,
  //   validateRequest(HotelController.createHotelSchema),
  HotelController.createHotelRoom
);

// update hotel
router.patch(
  "/:hotelId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "hotelDocs", maxCount: 5 },
  ]),
  parseBodyData,
  HotelController.updateHotel
);

// update hotel room
router.patch(
  "/room/:roomId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "hotelImages", maxCount: 5 },
    { name: "hotelRoomImages", maxCount: 5 },
  ]),
  parseBodyData,
  HotelController.updateHotelRoom
);


export const hotelRoute = router;
