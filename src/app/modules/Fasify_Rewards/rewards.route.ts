// import express from "express";
// import validateRequest from "../../middlewares/validateRequest";
// import auth from "../../middlewares/auth";
// import { UserRole } from "@prisma/client";
// import { RewardsController } from "./rewards.controller";
// import { RewardsValidation } from "./rewards.validation";

// const router = express.Router();

// // program (admin)
// router.get("/program", RewardsController.getProgram);
// router.post(
//   "/program",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   validateRequest(RewardsValidation.createProgramZodSchema),
//   RewardsController.upsertProgram
// );
// router.patch(
//   "/program",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   validateRequest(RewardsValidation.updateProgramZodSchema),
//   RewardsController.upsertProgram
// );

// // tiers (admin)
// router.post(
//   "/tiers",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   validateRequest(RewardsValidation.createTierZodSchema),
//   RewardsController.createTier
// );
// router.get("/tiers", RewardsController.getTiers);
// router.patch(
//   "/tiers/:id",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   validateRequest(RewardsValidation.updateTierZodSchema),
//   RewardsController.updateTier
// );
// router.delete(
//   "/tiers/:id",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   RewardsController.deleteTier
// );

// // offers (admin)
// router.post(
//   "/offers",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   validateRequest(RewardsValidation.createOfferZodSchema),
//   RewardsController.createOffer
// );
// router.get("/offers", RewardsController.getOffers);
// router.patch(
//   "/offers/:id",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   validateRequest(RewardsValidation.updateOfferZodSchema),
//   RewardsController.updateOffer
// );
// router.delete(
//   "/offers/:id",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   RewardsController.deleteOffer
// );

// // members
// router.get(
//   "/members/:userId/balance",
//   auth(UserRole.USER, UserRole.BUSINESS_PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   RewardsController.getUserBalance
// );
// router.get(
//   "/members/:userId/transactions",
//   auth(UserRole.USER, UserRole.BUSINESS_PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   RewardsController.getUserTransactions
// );
// router.post(
//   "/members/:userId/adjust",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   validateRequest(RewardsValidation.adjustPointsZodSchema),
//   RewardsController.adjustPoints
// );
// router.post(
//   "/members/:userId/redeem",
//   auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
//   validateRequest(RewardsValidation.redeemPointsZodSchema),
//   RewardsController.redeemPoints
// );

// export const rewardsRoute = router;

