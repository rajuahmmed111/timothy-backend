import express from "express";
import { ReviewController } from "./review.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

// create hotel review
router.post("/hotel", auth(), ReviewController.createHotelReview);

// create security review
router.post("/security", auth(), ReviewController.createSecurityReview);

export const reviewRoute = router;