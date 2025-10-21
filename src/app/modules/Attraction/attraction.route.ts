import express from "express";
import { AttractionController } from "./attraction.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import { uploadFile } from "../../../helpars/fileUploader";

const router = express.Router();

// get all attraction appeals active listing by partnerId
router.get(
  "/appeals-active-listing",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionController.getAllActiveListingAppealsByPartnerId
);

// get all attraction appeals available by partnerId
router.get(
  "/appeals-available",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionController.getAllAvailableListingAppealsByPartnerId
);

// get all attractions
router.get(
  "/",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  AttractionController.getAllAttractions
);

// get all attractions appeals
router.get(
  "/appeals",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  AttractionController.getAllAttractionsAppeals
);

// get all attractions appeals by attractionId
router.get(
  "/appeals/:attractionId",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  AttractionController.getAllAttractionsAppealsByAttractionId
);

// get all my attractions for partner
router.get(
  "/partner",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionController.getAllAttractionsForPartner
);

// get all attractions appeals for partner
router.get(
  "/partner-appeals/:attractionId",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionController.getAllAttractionsAppealsForPartner
);

// get attraction by attractionId
router.get(
  "/:attractionId",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  AttractionController.getSingleAttraction
);

// get single attraction appeal
router.get(
  "/appeal/:appealId",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  AttractionController.getSingleAttractionAppeal
);

// create attraction
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "attractionDocs", maxCount: 5 },
  ]),
  parseBodyData,
  AttractionController.createAttraction
);

// create attraction appeal
router.post(
  "/appeal/:attractionId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([{ name: "attractionImages", maxCount: 10 }]),
  parseBodyData,
  AttractionController.createAttractionAppeal
);

// update attraction
router.patch(
  "/:attractionId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "attractionDocs", maxCount: 5 },
  ]),
  parseBodyData,
  AttractionController.updateAttraction
);

// update attraction appeal by appealId
router.patch(
  "/appeal/:appealId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([{ name: "attractionImages", maxCount: 10 }]),
  parseBodyData,
  AttractionController.updateAttractionAppeal
);

// delete attraction
router.delete(
  "/:attractionId",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionController.deleteAttraction
);

// delete attraction appeal by appealId
router.delete(
  "/appeal/:appealId",
  auth(UserRole.BUSINESS_PARTNER),
  AttractionController.deleteAttractionAppeal
);

export const attractionRoute = router;
