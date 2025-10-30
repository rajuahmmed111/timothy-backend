import { BookingStatus, EveryServiceStatus } from "@prisma/client";
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
      where: { bookingStatus: BookingStatus.CONFIRMED },
    });

    for (const booking of expiredHotels) {
      if (isPastDate(booking.bookedToDate)) {
        await prisma.hotel_Booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });

        if (booking.roomId) {
          await prisma.room.update({
            where: { id: booking.roomId },
            data: { isBooked: EveryServiceStatus.AVAILABLE },
          });
        }
      }
    }

    // car bookings
    const expiredCars = await prisma.car_Booking.findMany({
      where: { bookingStatus: BookingStatus.CONFIRMED },
    });

    for (const booking of expiredCars) {
      if (isPastDate(booking.carBookedToDate)) {
        await prisma.car_Booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });

        if (booking.carId) {
          await prisma.car.update({
            where: { id: booking.carId },
            data: { isBooked: EveryServiceStatus.AVAILABLE },
          });
        }
      }
    }

    // security bookings
    const expiredSecurities = await prisma.security_Booking.findMany({
      where: { bookingStatus: BookingStatus.CONFIRMED },
    });

    for (const booking of expiredSecurities) {
      if (isPastDate(booking.securityBookedToDate)) {
        await prisma.security_Booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });

        if (booking.security_GuardId) {
          await prisma.security_Guard.update({
            where: { id: booking.security_GuardId },
            data: { isBooked: EveryServiceStatus.AVAILABLE },
          });
        }
      }
    }

    // attraction bookings
    const expiredAttractions = await prisma.attraction_Booking.findMany({
      where: { bookingStatus: BookingStatus.CONFIRMED },
    });

    for (const booking of expiredAttractions) {
      if (isPastDate(booking.date)) {
        await prisma.attraction_Booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });

        if (booking.appealId) {
          await prisma.appeal.update({
            where: { id: booking.appealId },
            data: { isBooked: EveryServiceStatus.AVAILABLE },
          });
        }
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
      data: { bookingStatus: BookingStatus.EXPIRED },
    });

    // security bookings
    await prisma.security_Booking.updateMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdAt: { lte: expiryTime },
      },
      data: { bookingStatus: BookingStatus.EXPIRED },
    });

    // car bookings
    await prisma.car_Booking.updateMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdAt: { lte: expiryTime },
      },
      data: { bookingStatus: BookingStatus.EXPIRED },
    });

    // attraction bookings
    await prisma.attraction_Booking.updateMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdAt: { lte: expiryTime },
      },
      data: { bookingStatus: BookingStatus.EXPIRED },
    });

    // console.log("Expired pending bookings auto-cancelled");
  });
};
