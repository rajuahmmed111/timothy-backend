import express from "express";
import { Security_ProtocolController } from "./security_protocol.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import { uploadFile } from "../../../helpars/fileUploader";

const router = express.Router();

// get all security protocols
router.get(
  "/",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  Security_ProtocolController.getAllSecurityProtocols
);

// get all security protocols security guard
router.get(
  "/security-guard",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  Security_ProtocolController.getAllSecurityProtocolsGuards
);

// get all security protocols security guard app
router.get(
  "/security-guard-app",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  Security_ProtocolController.getAllSecurityProtocolsGuardsApp
);

// get all security protocols for partner
router.get(
  "/partner",
  auth(UserRole.BUSINESS_PARTNER),
  Security_ProtocolController.getAllSecurityProtocolsForPartner
);

// get all security protocols security guard for partner
router.get(
  "/partner",
  auth(UserRole.BUSINESS_PARTNER),
  Security_ProtocolController.getAllSecurityProtocolsForPartner
);

// get popular security protocols
router.get(
  "/popular",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  Security_ProtocolController.getPopularSecurityProtocols
);

// get security protocols grouped by category
router.get(
  "/grouped-by-category",
  auth(UserRole.USER),
  Security_ProtocolController.getProtocolsGroupedByCategory
);

// get security protocol by id
router.get(
  "/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  Security_ProtocolController.getSingleSecurityProtocol
);

// create security protocol
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "securityDocs", maxCount: 5 },
  ]),
  parseBodyData,
  Security_ProtocolController.createSecurityProtocol
);

// create security protocol guard type
router.post(
  "/security-guard-type/:securityId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([{ name: "securityImages", maxCount: 10 }]),
  parseBodyData,
  Security_ProtocolController.createSecurityProtocolGuardType
);

// update security protocol
router.patch(
  "/:securityId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "securityDocs", maxCount: 5 },
  ]),
  parseBodyData,
  Security_ProtocolController.updateSecurityProtocol
);

// update security guard type
router.patch(
  "/security-guard-type/:guardId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([{ name: "securityImages", maxCount: 10 }]),
  parseBodyData,
  Security_ProtocolController.updateSecurityProtocolGuardType
);

export const securityProtocolRoute = router;
