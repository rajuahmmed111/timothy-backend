import express from "express";
import { SecurityBookingController } from "./security_booking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create security booking
router.post(
  "/:bookingId",
  auth(UserRole.BUSINESS_PARTNER, UserRole.USER),
  SecurityBookingController.createSecurityBooking
);

export const security_bookingRoute = router;
