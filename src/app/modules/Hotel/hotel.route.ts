import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { HotelController } from "./hotel.controller";

const router = express.Router();

// get all hotels
router.get("/", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN));

// create hotel
router.post("/", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), HotelController.createHotel);

export const hotelRoute = router;
