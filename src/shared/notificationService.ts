import admin from "../helpars/firebaseAdmin";
import prisma from "./prisma";

export enum ServiceType {
  HOTEL = "HOTEL",
  SECURITY = "SECURITY",
  CAR = "CAR",
  ATTRACTION = "ATTRACTION",
}

export interface IBookingNotificationData {
  bookingId: string;
  userId: string;
  partnerId: string;
  serviceType: ServiceType;
  serviceName: string;
  totalPrice: number;
  bookedFromDate: string;
  bookedToDate?: string;
  quantity?: number;
  additionalInfo?: any;
}

interface INotificationResult {
  success: boolean;
  notifications: Array<{
    type: "user" | "partner";
    success: boolean;
    response?: any;
    error?: string;
  }>;
  message: string;
  error?: string;
}

// user template
const getUserConfirmationMessage = (
  serviceType: ServiceType,
  data: IBookingNotificationData
) => {
  const templates = {
    [ServiceType.HOTEL]: {
      title: "Hotel Booking Confirmed! 🏨",
      body: `Your hotel booking at ${data.serviceName} has been confirmed. Check-in: ${data.bookedFromDate}. Booking ID: ${data.bookingId}`,
    },
    [ServiceType.SECURITY]: {
      title: "Security Service Booked! 🛡️",
      body: `Your security service from ${
        data.serviceName
      } has been confirmed. Service date: ${data.bookedFromDate}. Guards: ${
        data.quantity || 1
      }`,
    },
    [ServiceType.CAR]: {
      title: "Car Rental Confirmed! 🚗",
      body: `Your car rental from ${data.serviceName} has been confirmed. Pickup: ${data.bookedFromDate}. Total: ৳${data.totalPrice}`,
    },
    [ServiceType.ATTRACTION]: {
      title: "Attraction Booking Confirmed! 🎢",
      body: `Your booking for ${
        data.serviceName
      } has been confirmed. Visit date: ${data.bookedFromDate}. Tickets: ${
        data.quantity || 1
      }`,
    },
  };

  return templates[serviceType];
};

// partner template
const getPartnerNotificationMessage = (
  serviceType: ServiceType,
  data: IBookingNotificationData,
  userName: string
) => {
  const templates = {
    [ServiceType.HOTEL]: {
      title: "New Hotel Booking! 🏨",
      body: `New booking from ${userName}. Rooms: ${data.quantity}, Amount: ৳${data.totalPrice}. Check-in: ${data.bookedFromDate}`,
    },
    [ServiceType.SECURITY]: {
      title: "New Security Booking! 🛡️",
      body: `New security service booking from ${userName}. Guards: ${data.quantity}, Amount: ৳${data.totalPrice}. Date: ${data.bookedFromDate}`,
    },
    [ServiceType.CAR]: {
      title: "New Car Rental! 🚗",
      body: `New car rental from ${userName}. Vehicle: ${data.serviceName}, Amount: ৳${data.totalPrice}. Pickup: ${data.bookedFromDate}`,
    },
    [ServiceType.ATTRACTION]: {
      title: "New Attraction Booking! 🎢",
      body: `New booking from ${userName} for ${data.serviceName}. Tickets: ${data.quantity}, Amount: ৳${data.totalPrice}`,
    },
  };

  return templates[serviceType];
};

// save to DB
const sendNotification = async (
  receiverId: string,
  fcmToken: string | null,
  message: { title: string; body: string },
  data: IBookingNotificationData,
  type: "user" | "partner"
) => {
  if (!fcmToken) return { type, success: false, error: "No FCM token" };

  try {
    const response = await admin.messaging().send({
      notification: message,
      token: fcmToken,
    });

    // Save to DB
    await prisma.notifications.create({
      data: {
        receiverId,
        title: message.title,
        body: message.body,
        serviceType: data.serviceType,
        bookingId: data.bookingId,
      } as any,
    });

    return { type, success: true, response };
  } catch (error: any) {
    console.error(`${type} notification failed:`, error);
    return { type, success: false, error: error.message };
  }
};

// main function
const sendBookingNotifications = async (
  data: IBookingNotificationData
): Promise<INotificationResult> => {
  const notifications: Array<any> = [];

  try {
    const [userInfo, partnerInfo] = await Promise.all([
      prisma.user.findUnique({
        where: { id: data.userId },
        select: { fullName: true, fcmToken: true },
      }),
      prisma.user.findUnique({
        where: { id: data.partnerId },
        select: { fullName: true, fcmToken: true },
      }),
    ]);

    if (!userInfo) throw new Error("User not found");

    // User notification
    const userMessage = getUserConfirmationMessage(data.serviceType, data);
    if (userInfo.fcmToken) {
      const userResult = await sendNotification(
        data.userId,
        userInfo.fcmToken,
        userMessage,
        data,
        "user"
      );
      notifications.push(userResult);
    }

    // Partner notification
    if (partnerInfo?.fcmToken) {
      const partnerMessage = getPartnerNotificationMessage(
        data.serviceType,
        data,
        userInfo.fullName || "Unknown User"
      );
      const partnerResult = await sendNotification(
        data.partnerId,
        partnerInfo.fcmToken,
        partnerMessage,
        data,
        "partner"
      );
      notifications.push(partnerResult);
    }

    const successCount = notifications.filter((n) => n.success).length;

    return {
      success: successCount > 0,
      notifications,
      message: `${successCount} notifications sent successfully`,
    };
  } catch (error: any) {
    console.error("Booking notification service failed:", error);
    return {
      success: false,
      notifications,
      message: "Notification service failed",
      error: error.message,
    };
  }
};

export const BookingNotificationService = { sendBookingNotifications };
