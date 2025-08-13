import express from "express";
import { AttractionController } from "./attraction.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import { uploadFile } from "../../../helpars/fileUploader";

const router = express.Router();

// create attraction
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "attractionBusinessLogo", maxCount: 1 },
    { name: "attractionImages", maxCount: 5 },
    { name: "attractionDocs", maxCount: 5 },
  ]),
  parseBodyData,
  AttractionController.createAttraction
);

export const attractionRoute = router;
