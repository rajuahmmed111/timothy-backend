import express from "express";
import auth from "../../middlewares/auth";
import { NotificationController } from "./notification.controller";

const router = express.Router();

router.post(
  "/send-notification/:userId",
  auth(),
  NotificationController.sendNotification
);

router.post(
  "/send-notification",
  auth(),
  NotificationController.sendNotifications
);

// get my notifications by user id(this user id in booking data table userId column)
router.get(
  "/my-notifications",
  auth(),
  NotificationController.getMyNotifications
);

router.get("/", auth(), NotificationController.getNotifications);
router.get(
  "/:notificationId",
  auth(),
  NotificationController.getSingleNotificationById
);



export const notificationsRoute = router;
