import express from "express";
import { NewsRoomController } from "./news_room.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create news room
router.post(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  NewsRoomController.createNewsRoom
);

export const newsRoomRoute = router;
