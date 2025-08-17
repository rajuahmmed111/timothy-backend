import express from "express";
import { AttractionBookingController } from "./attraction_booking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all attraction bookings
router.get(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionBookingController.getAllAttractionBookings
);

// get all my attraction bookings
router.get(
  "/my-bookings",
  auth(UserRole.USER),
  AttractionBookingController.getAllMyAttractionBookings
);

// get attraction booking by id
router.get(
  "/:id",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionBookingController.getAttractionBookingById
);

// create attraction booking by attraction id
router.post(
  "/:attractionId",
  auth(UserRole.USER),
  AttractionBookingController.createAttractionBooking
);

export const attractionBookingRoutes = router;
