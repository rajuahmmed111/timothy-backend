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
    // category?: string | null;
  }
) => {
  const { adults, children, date, day, from, to } = data;

  if (!adults || !children || !date || !day || !from || !to) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Missing required booking fields"
    );
  }

  // 1️⃣ Get attraction
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

  // 2️⃣ Check schedule exists
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

  // 3️⃣ Check slot exists
  const slotExists = schedule.slots.some((s) => s.from === from && s.to === to);
  if (!slotExists) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Selected slot ${from}-${to} not available`
    );
  }

  // 4️⃣ Calculate total price
  let totalPrice =
    adults * (attraction.attractionAdultPrice || 0) +
    children * (attraction.attractionChildPrice || 0);

  if (attraction.vat) totalPrice += (totalPrice * attraction.vat) / 100;
  if (attraction.discount)
    totalPrice -= (totalPrice * attraction.discount) / 100;

  // 5️⃣ Create booking
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

export const AttractionBookingService = {
  createAttractionBooking,
};
