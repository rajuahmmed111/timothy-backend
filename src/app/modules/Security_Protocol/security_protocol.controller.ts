import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { Security_ProtocolService } from "./security_protocol.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create security protocol
const createSecurityProtocol = catchAsync(
  async (req: Request, res: Response) => {
    const result = await Security_ProtocolService.createSecurityProtocol(
      req
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Protocol created successfully",
      data: result,
    });
  }
);

export const Security_ProtocolController = {
  createSecurityProtocol,
};