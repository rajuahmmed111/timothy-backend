import express from "express";
import { Security_ProtocolController } from "./security_protocol.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import { uploadFile } from "../../../helpars/fileUploader";

const router = express.Router();

// create security protocol
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
    uploadFile.upload.fields([
      { name: "hotelLogo", maxCount: 1 },
      { name: "hotelRoomImages", maxCount: 5 },
      { name: "hotelDocs", maxCount: 5 },
    ]),
    parseBodyData,
  Security_ProtocolController.createSecurityProtocol
);

export const securityProtocolRoute = router;
