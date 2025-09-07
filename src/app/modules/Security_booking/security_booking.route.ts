import express from "express";
import { SecurityBookingController } from "./security_booking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all security bookings
router.get(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  SecurityBookingController.getAllSecurityBookings
);

// // get security booking by id
// router.get(
//   "/:id",
//   auth(UserRole.BUSINESS_PARTNER),
//   SecurityBookingController.getSingleSecurityBooking
// );

// get all my security bookings
router.get(
  "/my-bookings",
  auth(UserRole.USER),
  SecurityBookingController.getAllMySecurityBookings
);

// create security booking
router.post(
  "/:securityId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  SecurityBookingController.createSecurityBooking
);

export const security_bookingRoute = router;
