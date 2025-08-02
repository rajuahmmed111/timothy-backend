import express from "express";
import { HotelBookingController } from "./hotelBooking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all hotel bookings
router.get(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  HotelBookingController.getAllHotelBookings
);

// get hotel booking by id
router.get(
  "/:id",
  auth(UserRole.BUSINESS_PARTNER),
  HotelBookingController.getHotelBookingById
);

// create hotel booking
router.post(
  "/",
  auth(UserRole.USER),
  HotelBookingController.createHotelBooking
);

// update hotel booking status
router.patch(
  "/:id/status",
  auth(UserRole.BUSINESS_PARTNER),
  HotelBookingController.updateBookingStatus
);

export const hotelBookingRoute = router;
