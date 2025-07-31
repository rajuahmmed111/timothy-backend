import express from "express";
import { HotelBookingController } from "./hotelBooking.controller";

const router = express.Router();

// create hotel booking
router.post("/", HotelBookingController.createHotelBooking);

export const hotelBookingRoute = router;