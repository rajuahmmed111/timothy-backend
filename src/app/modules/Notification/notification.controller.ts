import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { NotificationService } from "./notification.service";
import sendResponse from "../../../shared/sendResponse";

// send notification
const sendNotification = catchAsync(async (req: Request, res: Response) => {
  const notification = await NotificationService.sendSingleNotification(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "notification sent successfully",
    data: notification,
  });
});

const sendNotifications = catchAsync(async (req: any, res: any) => {
  const notifications = await NotificationService.sendNotifications(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "notifications sent successfully",
    data: notifications,
  });
});

const getNotifications = catchAsync(async (req: any, res: any) => {
  const notifications = await NotificationService.getNotificationsFromDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications retrieved successfully",
    data: notifications,
  });
});

const getSingleNotificationById = catchAsync(async (req: any, res: any) => {
  const notificationId = req.params.notificationId;
  const notification = await NotificationService.getSingleNotificationFromDB(
    req,
    notificationId
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Notification retrieved successfully",
    data: notification,
  });
});
export const NotificationController = {
  sendNotification,
  sendNotifications,
  getNotifications,
  getSingleNotificationById,
};
