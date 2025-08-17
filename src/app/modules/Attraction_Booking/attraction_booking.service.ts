import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { BookingStatus, EveryServiceStatus } from "@prisma/client";

// create attraction booking
const createAttractionBooking = async (
  userId: string,
  attractionId: string,
  data: {
    adults: number;
    children: number;
    date: string; // "2025-08-12"
    day: string; // "THURSDAY"
    from: string; // "10:00:00"
    to: string; // "12:00:00"
  }
) => {
  const { adults, children, date, day, from, to } = data;

  if (!adults || !children || !date || !day || !from || !to) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Missing required booking fields"
    );
  }

  // get attraction
  const attraction = await prisma.attraction.findUnique({
    where: { id: attractionId },
    include: {
      attractionSchedule: {
        where: { date, day },
        include: { slots: true },
      },
    },
  });

  if (!attraction) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  }

  // check schedule exists
  if (
    !attraction.attractionSchedule ||
    attraction.attractionSchedule.length === 0
  ) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `No schedule found for ${date} (${day})`
    );
  }

  const schedule = attraction.attractionSchedule[0];

  // check slot exists
  const slotExists = schedule.slots.some((s) => s.from === from && s.to === to);
  if (!slotExists) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Selected slot ${from}-${to} not available`
    );
  }

  // calculate total price
  let totalPrice =
    adults * (attraction.attractionAdultPrice || 0) +
    children * (attraction.attractionChildPrice || 0);

  if (attraction.vat) totalPrice += (totalPrice * attraction.vat) / 100;
  if (attraction.discount)
    totalPrice -= (totalPrice * attraction.discount) / 100;

  // create booking
  const booking = await prisma.attraction_Booking.create({
    data: {
      userId,
      attractionId,
      partnerId: attraction.partnerId,
      adults,
      children,
      date,
      day,
      timeSlot: { from, to }, // Json column
      category: attraction.category as string,
      totalPrice,
      bookingStatus: "PENDING",
    },
  });

  return booking;
};

// get all attraction bookings
const getAllAttractionBookings = async (partnerId: string) => {
  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const result = await prisma.attraction_Booking.findMany({
    where: { partnerId: partner.id },
  });
  return result;
};

// get single attraction booking
const getAttractionBookingById = async (bookingId: string, userId: string) => {
  const findUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.attraction_Booking.findUnique({
    where: { id: bookingId, userId },
    include: {
      attraction: {
        select: {
          id: true,
          attractionName: true,
          attractionAdultPrice: true,
          attractionChildPrice: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
    },
  });
  return result;
};

// get all my attraction bookings
const getAllMyAttractionBookings = async (userId: string) => {
  const findUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.attraction_Booking.findMany({
    where: { userId: findUser.id },
    include: {
      attraction: {
        select: {
          id: true,
          attractionName: true,
          attractionAdultPrice: true,
          attractionChildPrice: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
    },
  });
  return result;
};

export const AttractionBookingService = {
  createAttractionBooking,
  getAllAttractionBookings,
  getAttractionBookingById,
  getAllMyAttractionBookings,
};
