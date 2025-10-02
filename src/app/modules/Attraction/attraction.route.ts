import express from "express";
import { AttractionController } from "./attraction.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import { uploadFile } from "../../../helpars/fileUploader";

const router = express.Router();

// get all attractions
router.get(
  "/",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  AttractionController.getAllAttractions
);

// get all my created attractions for partner
router.get(
  "/partner",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionController.getAllAttractionsForPartner
);

// get attraction by id
router.get(
  "/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  AttractionController.getSingleAttraction
);

// create attraction
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "attractionBusinessLogo", maxCount: 1 },
    { name: "attractionDocs", maxCount: 5 },
  ]),
  parseBodyData,
  AttractionController.createAttraction
);

// create attraction appeal
router.post(
  "/appeal/:attractionId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "attractionImages", maxCount: 10 },
  ]),
  parseBodyData,
  AttractionController.createAttractionAppeal
);

// update attraction
router.patch(
  "/:id",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "attractionBusinessLogo", maxCount: 1 },
    { name: "attractionImages", maxCount: 5 },
    { name: "attractionDocs", maxCount: 5 },
  ]),
  parseBodyData,
  AttractionController.updateAttraction
);

export const attractionRoute = router;
