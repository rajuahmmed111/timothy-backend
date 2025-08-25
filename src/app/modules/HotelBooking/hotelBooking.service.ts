import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { differenceInDays, parse } from "date-fns";
import { BookingStatus, EveryServiceStatus } from "@prisma/client";
import {
  IBookingFilterRequest,
  IHotelBookingData,
} from "./hotelBooking.interface";
import admin from "../../../helpars/firebaseAdmin";
// import { NotificationService } from "../Notification/notification.service";

// Updated createHotelBooking service with notifications
const createHotelBooking = async (
  userId: string,
  hotelId: string,
  data: IHotelBookingData
) => {
  const { rooms, adults, children, bookedFromDate, bookedToDate } = data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId, isBooked: EveryServiceStatus.AVAILABLE },
    select: {
      hotelRoomPriceNight: true,
      partnerId: true,
      discount: true,
      category: true,
      hotelName: true, // Hotel name for notification
    },
  });

  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  // Get partner/service provider info
  const partner = await prisma.user.findUnique({
    where: { id: hotel.partnerId },
    select: {
      fcmToken: true,
      fullName: true,
    },
  });

  if (!rooms || !adults || !children || !bookedFromDate || !bookedToDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing required fields");
  }

  // calculate number of nights
  const fromDate = parse(bookedFromDate, "yyyy-MM-dd", new Date());
  const toDate = parse(bookedToDate, "yyyy-MM-dd", new Date());

  const numberOfNights = differenceInDays(toDate, fromDate);

  if (numberOfNights <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid booking date range");
  }

  // calculate base price
  const roomPrice = hotel.hotelRoomPriceNight;
  let totalPrice = roomPrice * rooms * numberOfNights;

  // apply discount if available
  if (hotel.discount && hotel.discount > 0) {
    totalPrice -= (totalPrice * hotel.discount) / 100;
  }

  // Create booking
  const result = await prisma.hotel_Booking.create({
    data: {
      ...data,
      totalPrice,
      hotelId,
      userId,
      partnerId: hotel.partnerId,
      bookingStatus: BookingStatus.PENDING,
      category: hotel.category as string,
    },
  });

  // Send notifications after successful booking creation
  try {
    // 1. Send notification to user (booking confirmation)
    if (user.fcmToken) {
      const userNotificationData = {
        notification: {
          title: "Booking Confirmed! 🎉",
          body: `Your hotel booking at ${hotel.hotelName} has been confirmed. Booking ID: ${result.id}`,
        },
        token: user.fcmToken,
      };

      await admin.messaging().send(userNotificationData);

      // Save notification to database
      await prisma.notifications.create({
        data: {
          receiverId: userId,
          title: userNotificationData.notification.title,
          body: userNotificationData.notification.body,
        },
      });
    }

    // 2. Send notification to service provider/partner (new booking alert)
    if (partner && partner.fcmToken) {
      const partnerNotificationData = {
        notification: {
          title: "New Hotel Booking! 🏨",
          body: `New booking received from ${user.fullName} for ${rooms} room(s). Total: ৳${totalPrice}`,
        },
        token: partner.fcmToken,
      };

      await admin.messaging().send(partnerNotificationData);

      // Save notification to database
      await prisma.notifications.create({
        data: {
          receiverId: hotel.partnerId,
          title: partnerNotificationData.notification.title,
          body: partnerNotificationData.notification.body,
        },
      });
    }
  } catch (notificationError) {
    console.error("Failed to send notifications:", notificationError);
    // Don't throw error here, booking should still succeed even if notification fails
  }

  return result;
};

// get all hotel bookings
const getAllHotelBookings = async (partnerId: string) => {
  // find partner
  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const result = await prisma.hotel_Booking.findMany({
    where: { partnerId },
    include: {
      hotel: {
        select: {
          id: true,
          hotelName: true,
        },
      },
    },
  });

  if (result.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No bookings found");
  }

  return result;
};

// get all my hotel bookings
const getAllMyHotelBookings = async (userId: string) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.hotel_Booking.findMany({
    where: { userId },
    include: {
      hotel: {
        select: {
          id: true,
          hotelName: true,
          hotelRoomPriceNight: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
    },
  });
  return result;
};

// get my all (hotel, security, car, attraction) bookings
// const getAllMyBookings = async (
//   authUserId: string,
//   params: IBookingFilterRequest
// ) => {
//   // Validate user exists
//   const user = await prisma.user.findUnique({ where: { id: authUserId } });
//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }

//   if (!params.category) {
//     // No filter, get all bookings
//     const [hotels, securities, ] = await Promise.all([
//       prisma.hotel_Booking.findMany({ where: { userId: authUserId } }),
//       prisma.security_Booking.findMany({ where: { userId: authUserId } }),
//       // prisma.car_Booking.findMany({ where: { userId: authUserId } }),
//       // prisma.attraction_Booking.findMany({ where: { userId: authUserId } }),
//     ]);

//     return { hotels, securities, };
//   }

//   // Only fetch and return one category as per filter
//   switch (params.category) {
//     case "hotel":
//       const hotels = await prisma.hotel_Booking.findMany({
//         where: { userId: authUserId, category: "hotel" },
//         include: { hotel: true },
//       });
//       return { hotels };
//     case "security":
//       const securities = await prisma.security_Booking.findMany({
//         where: { userId: authUserId, category: "security" },
//         include: { security: true },
//       });
//       return { securities };
//     // case "car":
//     //   const cars = await prisma.car_Booking.findMany({
//     //     where: { userId: authUserId, category: "car" },
//     //     include: { car: true },
//     //   });
//     //   return { cars };
//     // case "attraction":
//     //   const attractions = await prisma.attraction_Booking.findMany({
//     //     where: { userId: authUserId, category: "attraction" },
//     //     include: { attraction: true },
//     //   });
//     //   return { attractions };
//     default:
//       throw new ApiError(httpStatus.BAD_REQUEST, "Invalid category");
//   }
// };

// get hotel booking by id
const getHotelBookingById = async (partnerId: string, bookingId: string) => {
  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, partnerId },
    include: {
      hotel: {
        select: {
          id: true,
          hotelName: true,
          hotelRoomPriceNight: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
    },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.hotel.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this booking"
    );
  }
  return booking;
};

// cancel my hotel booking only user
const cancelMyHotelBooking = async (
  userId: string,
  bookingId: string,
  bookingStatus: "CANCELLED"
) => {
  const findUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, userId },
    include: {
      hotel: true,
    },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.userId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this booking"
    );
  }

  const updatedBooking = await prisma.hotel_Booking.update({
    where: { id: bookingId },
    data: {
      bookingStatus,
    },
  });

  return updatedBooking;
};

// update booking status
const updateBookingStatus = async (
  partnerId: string,
  bookingId: string,
  bookingStatus: "CONFIRMED" | "CANCELLED"
) => {
  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, partnerId },
    include: {
      hotel: true,
    },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this booking"
    );
  }

  const updatedBooking = await prisma.hotel_Booking.update({
    where: { id: bookingId },
    data: {
      bookingStatus,
    },
  });

  return updatedBooking;
};

export const HotelBookingService = {
  createHotelBooking,
  getAllHotelBookings,
  getAllMyHotelBookings,
  // getAllMyBookings,
  getHotelBookingById,
  cancelMyHotelBooking,
  updateBookingStatus,
};
