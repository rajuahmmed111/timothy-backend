import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { ContractService } from "./contract.service";

// get all contracts (bookings)
const getAllContracts = catchAsync(async (req: Request, res: Response) => {
  const result = await ContractService.getAllContracts();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contracts fetched successfully",
    data: result,
  });
});

// get single contract
const getSingleContract = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await ContractService.getSingleContract(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contract fetched successfully",
    data: result,
  });
});

export const ContractController = {
  getAllContracts,
  getSingleContract,
};
