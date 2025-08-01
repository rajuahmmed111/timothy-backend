import express from "express";
import { Security_ProtocolController } from "./security_protocol.controller";

const router = express.Router();

// create security protocol
router.post("/", Security_ProtocolController.createSecurityProtocol);

export const securityProtocolRoute = router;
