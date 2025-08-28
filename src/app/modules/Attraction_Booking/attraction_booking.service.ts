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
  }
) => {
  const { adults, children, date, day, from } = data;

  // validate required fields
  if (adults == null || children == null || !date || !day || !from) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Missing required booking fields"
    );
  }

  // get attraction with schedules & slots
  const attraction = await prisma.attraction.findUnique({
    where: { id: attractionId },
    include: {
      attractionSchedule: {
        where: { date, day },
        include: {
          slots: true, // load all slots
        },
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

  // find matching slot
  const slot = schedule.slots.find((s) => s.from === from);
  if (!slot) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Selected slot ${from} not available`
    );
  }

  // calculate total price
  let totalPrice =
    adults * (attraction.attractionAdultPrice || 0) +
    children * (attraction.attractionChildPrice || 0);

  if (attraction.vat) {
    totalPrice += (totalPrice * attraction.vat) / 100;
  }
  if (attraction.discount) {
    totalPrice -= (totalPrice * attraction.discount) / 100;
  }

  // create booking
  const booking = await prisma.attraction_Booking.create({
    data: {
      userId,
      attractionId,
      partnerId: attraction.partnerId!,
      adults,
      children,
      date,
      day,
      timeSlot: { from: slot.from, to: slot.to }, // use slot object directly
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
    include: {
      attraction:{
        select: {
          id: true,
          attractionName: true,
        },
      }
    }
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
