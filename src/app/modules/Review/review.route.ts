import express from "express";
import { ReviewController } from "./review.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

// create review
router.post("/", auth(), ReviewController.createReview);

export const reviewRoute = router;