import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { uploadFile } from "../../../helpars/fileUploader";
import { CarRentalController } from "./carRental.controller";
import { parseBodyData } from "../../middlewares/parseNestedJson";

const router = express.Router();

// get all car rentals
router.get(
  "/",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  CarRentalController.getAllCarRentals
);

// get all my created car rentals for partner
router.get(
  "/partner",
  auth(UserRole.BUSINESS_PARTNER),
  CarRentalController.getAllCarRentalsForPartner
);

// get car rental by id
router.get(
  "/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_PARTNER,
    UserRole.USER
  ),
  CarRentalController.getSingleCarRental
);

// create car rental
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "carDocs", maxCount: 5 },
  ]),
  parseBodyData,
  CarRentalController.createCarRental
);

// create car
router.post(
  "/car/:car_RentalId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([{ name: "carImages", maxCount: 5 }]),
  parseBodyData,
  CarRentalController.createCar
);

// update car rental
router.patch(
  "/:car_RentalId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "carDocs", maxCount: 5 },
  ]),
  parseBodyData,
  CarRentalController.updateCarRental
);

// update car
router.patch(
  "/car/:carId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([{ name: "carImages", maxCount: 5 }]),
  parseBodyData,
  CarRentalController.updateCar
);


export const carRentalRoutes = router;
