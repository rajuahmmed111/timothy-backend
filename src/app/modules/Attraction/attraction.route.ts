import express from "express";
import { AttractionController } from "./attraction.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create attraction
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionController.createAttraction
);

export const attractionRoute = router;
