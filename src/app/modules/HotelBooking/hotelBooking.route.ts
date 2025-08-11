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

// get all my hotel bookings
router.get(
  "/my-bookings",
  auth(UserRole.USER),
  HotelBookingController.getAllMyHotelBookings
);

// get my all (hotel, security, car, attraction) bookings
// router.get(
//   "/my-bookings",
//   auth(UserRole.USER),
//   HotelBookingController.getAllMyBookings
// );

// get hotel booking by id
router.get(
  "/:id",
  auth(UserRole.BUSINESS_PARTNER),
  HotelBookingController.getHotelBookingById
);

// create hotel booking
router.post(
  "/:hotelId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  HotelBookingController.createHotelBooking
);

// cancel my (hotel, security, car, attraction) booking only user
router.patch(
  "/cancel-my-booking/:id",
  auth(UserRole.USER),
  HotelBookingController.cancelMyHotelBooking
);

// update hotel booking status
router.patch(
  "/status/:id",
  auth(UserRole.BUSINESS_PARTNER),
  HotelBookingController.updateBookingStatus
);

export const hotelBookingRoute = router;
