import express from "express";
import { NewsRoomController } from "./news_room.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { uploadFile } from "../../../helpars/fileUploader";
import { parseBodyData } from "../../middlewares/parseNestedJson";

const router = express.Router();

// create news room
router.post(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  uploadFile.upload.fields([{ name: "image", maxCount: 5 }]),
  parseBodyData,
  NewsRoomController.createNewsRoom
);

export const newsRoomRoute = router;
