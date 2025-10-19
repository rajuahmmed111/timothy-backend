import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { Security_ProtocolService } from "./security_protocol.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";
import { filterField } from "./security_protocol.constant";

// create security protocol
const createSecurityProtocol = catchAsync(
  async (req: Request, res: Response) => {
    const result = await Security_ProtocolService.createSecurityProtocol(req);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Security Protocol created successfully",
      data: result,
    });
  }
);

// create security protocol guard type
const createSecurityProtocolGuardType = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await Security_ProtocolService.createSecurityProtocolGuardType(req);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Security Protocol created successfully",
      data: result,
    });
  }
);

// get all security protocols
const getAllSecurityProtocols = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await Security_ProtocolService.getAllSecurityProtocols(
      filter,
      options
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security protocols fetched successfully",
      data: result,
    });
  }
);

// get all security protocols security guard
const getAllSecurityProtocolsGuards = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await Security_ProtocolService.getAllSecurityProtocolsGuards(
      filter,
      options
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security protocols fetched successfully",
      data: result,
    });
  }
);

// get all security protocols security guard app
const getAllSecurityProtocolsGuardsApp = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result =
      await Security_ProtocolService.getAllSecurityProtocolsGuardsApp(
        filter,
        options
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security protocols fetched successfully",
      data: result,
    });
  }
);

// get all security protocols for partner
const getAllSecurityProtocolsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result =
      await Security_ProtocolService.getAllSecurityProtocolsForPartner(
        partnerId,
        filter,
        options
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security protocols fetched successfully",
      data: result,
    });
  }
);

// get all security protocols for partner security guard
const getAllSecurityProtocolsForPartnerSecurityGuards = catchAsync(
  async (req: Request, res: Response) => {
    const securityId = req.params.securityId;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result =
      await Security_ProtocolService.getAllSecurityProtocolsForPartnerSecurityGuards(
        securityId,
        filter,
        options
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security protocols fetched successfully",
      data: result,
    });
  }
);

// get popular security protocols
const getPopularSecurityProtocols = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const result = await Security_ProtocolService.getPopularSecurityProtocols(
      filter
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Popular security protocols fetched successfully",
      data: result,
    });
  }
);

// get protocols grouped by category
const getProtocolsGroupedByCategory = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await Security_ProtocolService.getProtocolsGroupedByCategory();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security protocols grouped by category",
      data: result,
    });
  }
);

// get single security protocol
const getSingleSecurityProtocol = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await Security_ProtocolService.getSingleSecurityProtocol(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Protocol fetched successfully",
      data: result,
    });
  }
);

// get single security protocol security guard
const getSingleSecurityProtocolGuard = catchAsync(
  async (req: Request, res: Response) => {
    const guardId = req.params.guardId;
    const result =
      await Security_ProtocolService.getSingleSecurityProtocolGuard(guardId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Guard fetched successfully",
      data: result,
    });
  }
);

// update security protocol
const updateSecurityProtocol = catchAsync(
  async (req: Request, res: Response) => {
    const result = await Security_ProtocolService.updateSecurityProtocol(req);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Protocol updated successfully",
      data: result,
    });
  }
);

// update security protocol guard type
const updateSecurityProtocolGuardType = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await Security_ProtocolService.updateSecurityProtocolGuardType(req);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Guard updated successfully",
      data: result,
    });
  }
);

// delete security protocol
const deleteSecurityProtocol = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const securityId = req.params.securityId;
    const result = await Security_ProtocolService.deleteSecurityProtocol(
      securityId,
      partnerId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Protocol deleted successfully",
      data: result,
    });
  }
);

// delete security protocol guard
const deleteSecurityProtocolGuard = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const guardId = req.params.guardId;
    const result = await Security_ProtocolService.deleteSecurityProtocolGuard(
      partnerId,
      guardId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Security Guard deleted successfully",
      data: result,
    });
  }
);

export const Security_ProtocolController = {
  createSecurityProtocol,
  createSecurityProtocolGuardType,
  getAllSecurityProtocols,
  getAllSecurityProtocolsGuardsApp,
  getAllSecurityProtocolsGuards,
  getAllSecurityProtocolsForPartner,
  getAllSecurityProtocolsForPartnerSecurityGuards,
  getPopularSecurityProtocols,
  getProtocolsGroupedByCategory,
  getSingleSecurityProtocol,
  getSingleSecurityProtocolGuard,
  updateSecurityProtocol,
  updateSecurityProtocolGuardType,
  deleteSecurityProtocol,
  deleteSecurityProtocolGuard,
};
