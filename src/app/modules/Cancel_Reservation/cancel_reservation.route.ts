import express from "express";
import { HumanRightController } from "./cancel_reservation.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create or update cancel reservation
router.patch(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  HumanRightController.createOrUpdateCancelReservation
);

// get all cancel reservation
router.get(
  "/",
//   auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  HumanRightController.getAllCancelReservation
);

export const cancelReservationRoute = router;
