import { Router } from "express";
import { messageControllers } from "./message.controller";
import auth from "../../middlewares/auth";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import { uploadFile } from "../../../helpars/fileUploader";

const router = Router();

// send message
router.post(
  "/send-message/:receiverId",
  auth(),
  uploadFile.uploadMessageImages,
  parseBodyData,
  messageControllers.sendMessage
);

router.get("/channels", auth(), messageControllers.getUserChannels);

// get all message
router.get(
  "/get-message/:channelName",
  auth(),
  messageControllers.getMessagesFromDB
);

export const messageRoutes = router;
