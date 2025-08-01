import express from "express";
import { HotelBookingController } from "./hotelBooking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create hotel booking
router.post(
  "/",
  auth(UserRole.USER),
  HotelBookingController.createHotelBooking
);

export const hotelBookingRoute = router;
