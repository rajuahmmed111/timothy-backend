import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { NotificationService } from "./notification.service";
import sendResponse from "../../../shared/sendResponse";

// send notification
const sendNotification = catchAsync(async (req: Request, res: Response) => {
  // const payload = req.body;
  const notification = await NotificationService.sendSingleNotification(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "notification sent successfully",
    data: notification,
  });
});

const sendNotifications = catchAsync(async (req: Request, res: Response) => {
  const notifications = await NotificationService.sendNotifications(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "notifications sent successfully",
    data: notifications,
  });
});

const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const notifications = await NotificationService.getNotificationsFromDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications retrieved successfully",
    data: notifications,
  });
});

const getSingleNotificationById = catchAsync(
  async (req: Request, res: Response) => {
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
  }
);

// get my all notifications
const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const notifications = await NotificationService.getMyNotifications(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "My notifications retrieved successfully",
    data: notifications,
  });
});

export const NotificationController = {
  sendNotification,
  sendNotifications,
  getNotifications,
  getSingleNotificationById,
  getMyNotifications,
};
