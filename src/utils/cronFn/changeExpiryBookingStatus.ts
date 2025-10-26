import { BookingStatus } from "@prisma/client";
import cron from "node-cron";
import dayjs from "dayjs";
import prisma from "../../shared/prisma";
import { subMinutes } from "date-fns";

// Helper function for date check
const isPastDate = (date: string) => {
  return dayjs(date).isBefore(dayjs(), "day"); // Check if the date is before the current date
};

export const changeExpiryBookingStatus = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Booking status update job running...");

    // hotel bookings
    const expiredHotels = await prisma.hotel_Booking.findMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
      },
    });

    for (const booking of expiredHotels) {
      if (isPastDate(booking.bookedToDate)) {
        await prisma.hotel_Booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });
      }
    }

    // car bookings
    const expiredCars = await prisma.car_Booking.findMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
      },
    });

    for (const booking of expiredCars) {
      if (isPastDate(booking.carBookedToDate)) {
        await prisma.car_Booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });
      }
    }

    // security bookings
    const expiredSecurities = await prisma.security_Booking.findMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
      },
    });

    for (const booking of expiredSecurities) {
      if (isPastDate(booking.securityBookedToDate)) {
        await prisma.security_Booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });
      }
    }

    // attraction bookings
    const expiredAttractions = await prisma.attraction_Booking.findMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
      },
    });

    for (const booking of expiredAttractions) {
      if (isPastDate(booking.date)) {
        await prisma.attraction_Booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });
      }
    }

    console.log("All expired bookings marked as COMPLETED");
  });
};

export const changeExpiryBookingStatusForCancel = () => {
  // Node-Cron (run every 10 minutes)
  cron.schedule("*/10 * * * *", async () => {
    const expiryTime = subMinutes(new Date(), 10);

    // hotel bookings
    await prisma.hotel_Booking.updateMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdAt: { lte: expiryTime },
      },
      data: { bookingStatus: BookingStatus.CANCELLED },
    });

    // security bookings
    await prisma.security_Booking.updateMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdAt: { lte: expiryTime },
      },
      data: { bookingStatus: BookingStatus.CANCELLED },
    });

    // car bookings
    await prisma.car_Booking.updateMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdAt: { lte: expiryTime },
      },
      data: { bookingStatus: BookingStatus.CANCELLED },
    });

    // attraction bookings
    await prisma.attraction_Booking.updateMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdAt: { lte: expiryTime },
      },
      data: { bookingStatus: BookingStatus.CANCELLED },
    });

    // console.log("Expired pending bookings auto-cancelled");
  });
};
