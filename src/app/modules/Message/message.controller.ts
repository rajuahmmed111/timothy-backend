import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { messageServices } from "./message.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { uploadFile } from "../../../helpars/fileUploader";

// send message
const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const senderId = req.user?.id;
  const receiverId = req.params.receiverId;
  const { message } = req.body;

  // multer array => req.files as Express.Multer.File[]
  const files = req.files as Express.Multer.File[] | undefined;

  let imageUrls: string[] = [];

  if (files && files.length > 0) {
    // Cloudinary upload use
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const uploaded = await uploadFile.uploadToCloudinary(file);
        return uploaded?.secure_url; // cloudinary URL
      })
    );
    imageUrls = uploadResults.filter((url): url is string => !!url);
  }

  const result = await messageServices.sendMessage(
    senderId!,
    receiverId,
    message,
    imageUrls
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Message send successfully",
    data: result,
  });
});

// get my channel through my id and receiver id
const getMyChannel = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const receiverId = req.params.receiverId;
  const result = await messageServices.getMyChannel(userId, receiverId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Channel retrieved successfully",
    data: result,
  });
});

// get all messages
const getMessagesFromDB = catchAsync(async (req: Request, res: Response) => {
  const { channelName } = req.params;
  //  console.log(channelName);

  const messages = await messageServices.getMessagesFromDB(channelName);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Messages retrieved successfully",
    data: messages,
  });
});

const getUserChannels = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  // console.log(userId);

  const channels = await messageServices.getUserChannels(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Channels retrieved successfully",
    data: channels,
  });
});

export const messageControllers = {
  sendMessage,
  getMyChannel,
  getMessagesFromDB,
  getUserChannels,
};
