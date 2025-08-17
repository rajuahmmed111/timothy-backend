import express from "express";
import { AttractionBookingController } from "./attraction_booking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create attraction booking by attraction id
router.post(
  "/:attractionId",
  auth(UserRole.USER),
  AttractionBookingController.createAttractionBooking
);

export const attractionBookingRoutes = router;
