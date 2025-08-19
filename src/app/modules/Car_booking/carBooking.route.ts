import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { CarRentalBookingController } from "./carBooking.controller";

const router = express.Router();

// get all car rental bookings
router.get(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  CarRentalBookingController.getAllCarBookings
);

// get all my car rental bookings
router.get(
  "/my-bookings",
  auth(UserRole.USER),
  CarRentalBookingController.getAllMyCarBookings
);

// get car rental booking by id
router.get(
  "/:id",
  auth(UserRole.BUSINESS_PARTNER, UserRole.USER),
  CarRentalBookingController.getSingleCarBooking
);

// create car rental booking
router.post(
  "/:carId",
  auth(UserRole.BUSINESS_PARTNER, UserRole.USER),
  CarRentalBookingController.createCarBooking
);

export const carBookingRoute = router;
