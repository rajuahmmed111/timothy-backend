import express from "express";
import { ReviewController } from "./review.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

// create hotel review
router.post("/hotel", auth(), ReviewController.createHotelReview);

// create security review
router.post("/security", auth(), ReviewController.createSecurityReview);

// create car review
router.post("/car", auth(), ReviewController.createCarReview);

// create attraction review
router.post("/attraction", auth(), ReviewController.createAttractionReview);

export const reviewRoute = router;