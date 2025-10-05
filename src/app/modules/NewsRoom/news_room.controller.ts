import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { NewsRoomService } from "./news_room.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create news room
const createNewsRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsRoomService.createNewsRoom(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "News Room created successfully",
    data: result,
  });
});

export const NewsRoomController = {
  createNewsRoom,
};