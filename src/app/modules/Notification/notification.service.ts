import ApiError from "../../../errors/ApiErrors";
import admin from "../../../helpars/firebaseAdmin";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import prisma from "../../../shared/prisma";

// Send notification to a single user
const sendSingleNotification = async (req: any) => {
  console.log(req, "req");
  const user = await prisma.user.findUnique({
    where: { id: req.params.userId },
  });

  if (!user?.fcmToken) {
    throw new ApiError(404, "User not found with FCM token");
  }

  const message = {
    notification: {
      title: req.body.title,
      body: req.body.body,
    },
    token: user.fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    // await prisma.notifications.create({
    //   data: {
    //     receiverId: req.params.userId,
    //     title: req.body.title,
    //     body: req.body.body,
    //   },
    // });
    return response;
  } catch (error: any) {
    if (error.code === "messaging/invalid-registration-token") {
      throw new ApiError(400, "Invalid FCM registration token");
    } else if (error.code === "messaging/registration-token-not-registered") {
      throw new ApiError(404, "FCM token is no longer registered");
    } else {
      throw new ApiError(500, "Failed to send notification");
    }
  }
};

// Send notifications to all users with valid FCM tokens
const sendNotifications = async (req: any) => {
  const users = await prisma.user.findMany({
    where: {
      fcmToken: {
        not: null, // Ensure the token is not null
      },
    },
    select: {
      id: true,
      fcmToken: true,
    },
  });

  if (!users || users.length === 0) {
    throw new ApiError(404, "No users found with FCM tokens");
  }

  const fcmTokens = users.map((user) => user.fcmToken);

  const message = {
    notification: {
      title: req.body.title,
      body: req.body.body,
    },
    tokens: fcmTokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message as any);
  //   const response = await admin.messaging().sendEachForMulticast(message as any);

  // Find indices of successful responses
  const successIndices = response.responses
    .map((res: any, idx: any) => (res.success ? idx : null))
    .filter((idx: any) => idx !== null) as number[];

  // Filter users by success indices
  const successfulUsers = successIndices.map((idx) => users[idx]);

  if (successfulUsers.length === 0) {
    throw new ApiError(500, "Failed to send notifications to some users");
  }

  // Prepare notifications data for only successfully notified users
  const notificationData = successfulUsers.map((user) => ({
    receiverId: user?.id,
    title: req.body.title,
    body: req.body.body,
  }));

  // Save notifications for successfully notified users
  await prisma.notifications.createMany({
    data: notificationData,
  });

  // Collect failed tokens
  const failedTokens = response.responses
    .map((res: any, idx: any) => (!res.success ? fcmTokens[idx] : null))
    .filter((token: any) => token !== null);

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    failedTokens,
  };
};

// get all notifications
const getAllNotifications = async (
  adminId: string,
  options: IPaginationOptions
) => {
  // find admin
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: {
      supportNotification: true,
      paymentNotification: true,
      emailNotification: true,
    },
  });

  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  // serviceTypes dynamically excluded
  const excludedTypes: string[] = [];

  if (user?.supportNotification === false) {
    excludedTypes.push("SUPPORT");
  }
  if (user?.paymentNotification === false) {
    excludedTypes.push("ATTRACTION", "CAR", "SECURITY", "HOTEL");
  }
  if (user?.emailNotification === false) {
    excludedTypes.push("EMAIL");
  }

  const where: any = {};
  if (excludedTypes.length > 0) {
    where.serviceTypes = { notIn: excludedTypes };
  }

  const result = await prisma.notifications.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { read: "asc" },
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    ],
  });

  const total = await prisma.notifications.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get single notification
const getSingleNotificationFromDB = async (
  req: any,
  notificationId: string
) => {
  const notification = await prisma.notifications.findFirst({
    where: {
      id: notificationId,
      receiverId: req.user.id,
    },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found for the user");
  }

  await prisma.notifications.update({
    where: { id: notificationId },
    data: { read: true },
  });

  return notification;
};

// get my all notifications
const getMyNotifications = async (userId: string) => {
  return prisma.notifications.findMany({
    where: { receiverId: userId },
    orderBy: { createdAt: "desc" }, // newest first
  });
};

// delete notification
const deleteNotification = async (notificationId: string) => {
  // find notification
  const notification = await prisma.notifications.findUnique({
    where: {
      id: notificationId,
    },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  const result = await prisma.notifications.delete({
    where: { id: notificationId },
  });

  return result;
};

// mark as read notification
const markAsReadNotification = async (notificationId: string) => {
  // find notification
  const notification = await prisma.notifications.findUnique({
    where: {
      id: notificationId,
    },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return prisma.notifications.update({
    where: { id: notificationId },
    data: { read: true },
  });
};

export const NotificationService = {
  sendSingleNotification,
  sendNotifications,
  getAllNotifications,
  getSingleNotificationFromDB,
  getMyNotifications,
  deleteNotification,
  markAsReadNotification,
};
