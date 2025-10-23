import express from "express";
import { ReviewController } from "./review.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

// get all reviews
router.get("/", ReviewController.getAllReviews);

// get all hotel reviews by hotel id
router.get("/hotel/:hotelId", ReviewController.getAllHotelReviewsByHotelId);

// create hotel review
router.post("/hotel", auth(), ReviewController.createHotelReview);

// create security review
router.post("/security", auth(), ReviewController.createSecurityReview);

// create car review
router.post("/car", auth(), ReviewController.createCarReview);

// create attraction review
router.post("/attraction", auth(), ReviewController.createAttractionReview);

export const reviewRoute = router;