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
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  CarRentalController.getAllCarRentals
);

// get all car rentals cars
router.get(
  "/cars",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  CarRentalController.getAllCarRentalsCars
);

// get all car rentals cars by carRental carRentalId
router.get(
  "/cars/:carRentalId",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  CarRentalController.getAllCarRentalsCarsByCarRentalId
);

// get all my created car rentals for partner
router.get(
  "/partner",
  auth(UserRole.BUSINESS_PARTNER),
  CarRentalController.getAllCarRentalsForPartner
);

// get all my created car rentals cars for partner
router.get(
  "/cars-partner/:car_RentalId",
  auth(UserRole.BUSINESS_PARTNER),
  CarRentalController.getAllCarRentalsCarsForPartner
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

// get single by car id
router.get(
  "/car/:carId",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  CarRentalController.getSingleCar
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

// delete car rental
router.delete(
  "/:car_RentalId",
  auth(UserRole.BUSINESS_PARTNER),
  CarRentalController.deleteCarRental
);

// delete car
router.delete(
  "/car/:carId",
  auth(UserRole.BUSINESS_PARTNER),
  CarRentalController.deleteCar
);

export const carRentalRoutes = router;
