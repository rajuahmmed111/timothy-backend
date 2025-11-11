// import httpStatus from "http-status";
// import catchAsync from "../../../shared/catchAsync";
// import sendResponse from "../../../shared/sendResponse";
// import { Request, Response } from "express";
// import { RewardsService } from "./rewards.service";

// // program
// const upsertProgram = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.upsertProgram(req.body);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward program saved successfully!",
//     data: result,
//   });
// });

// const getProgram = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.getProgram();
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward program retrieved successfully!",
//     data: result,
//   });
// });

// // tiers
// const createTier = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.createTier(req.body);
//   sendResponse(res, {
//     statusCode: httpStatus.CREATED,
//     success: true,
//     message: "Reward tier created successfully!",
//     data: result,
//   });
// });

// const getTiers = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.getTiers();
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward tiers retrieved successfully!",
//     data: result,
//   });
// });

// const updateTier = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.updateTier(req.params.id, req.body);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward tier updated successfully!",
//     data: result,
//   });
// });

// const deleteTier = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.deleteTier(req.params.id);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward tier deleted successfully!",
//     data: result,
//   });
// });

// // offers
// const createOffer = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.createOffer(req.body);
//   sendResponse(res, {
//     statusCode: httpStatus.CREATED,
//     success: true,
//     message: "Reward offer created successfully!",
//     data: result,
//   });
// });

// const getOffers = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.getOffers();
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward offers retrieved successfully!",
//     data: result,
//   });
// });

// const updateOffer = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.updateOffer(req.params.id, req.body);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward offer updated successfully!",
//     data: result,
//   });
// });

// const deleteOffer = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.deleteOffer(req.params.id);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward offer deleted successfully!",
//     data: result,
//   });
// });

// // members
// const getUserBalance = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.getUserBalance(req.params.userId);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward balance retrieved successfully!",
//     data: result,
//   });
// });

// const getUserTransactions = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.getUserTransactions(req.params.userId);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Reward transactions retrieved successfully!",
//     data: result,
//   });
// });

// const adjustPoints = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.adjustPoints(
//     req.params.userId,
//     req.body.points,
//     { reason: req.body.reason }
//   );
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Points adjusted successfully!",
//     data: result,
//   });
// });

// const redeemPoints = catchAsync(async (req: Request, res: Response) => {
//   const result = await RewardsService.redeemPoints(
//     req.params.userId,
//     req.body.points,
//     req.body.referenceId
//   );
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Points redeemed successfully!",
//     data: result,
//   });
// });

// export const RewardsController = {
//   upsertProgram,
//   getProgram,
//   createTier,
//   getTiers,
//   updateTier,
//   deleteTier,
//   createOffer,
//   getOffers,
//   updateOffer,
//   deleteOffer,
//   getUserBalance,
//   getUserTransactions,
//   adjustPoints,
//   redeemPoints,
// };

