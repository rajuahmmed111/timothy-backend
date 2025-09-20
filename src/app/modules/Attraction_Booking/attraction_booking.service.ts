import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { parse, startOfDay, isBefore, format } from "date-fns";

interface IAttractionBookingData {
  adults: number;
  children: number;
  date: string; // "2025-08-12"
  from: string; // "10:00:00"
}

function parseTime(time: string) {
  const [h, m, s] = time.split(":").map(Number);
  return h * 60 + m + s / 60;
}

// create attraction booking
const createAttractionBooking = async (
  userId: string,
  attractionId: string,
  data: IAttractionBookingData
) => {
  const { adults, children, date, from } = data;

  // Validate required fields
  if (adults == null || children == null || !date || !from) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Missing required booking fields"
    );
  }

  // Convert date & time
  const bookingDate = parse(date, "yyyy-MM-dd", new Date());
  const today = startOfDay(new Date());
  const now = new Date();

  if (isBefore(bookingDate, today)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot book for past dates");
  }

  // Same-day past time check
  if (bookingDate.getTime() === today.getTime()) {
    const [hours, minutes, seconds] = from.split(":").map(Number);
    const bookingTime = new Date(today);
    bookingTime.setHours(hours, minutes, seconds, 0);

    if (isBefore(bookingTime, now)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot book for past time slots today"
      );
    }
  }

  // Get day from date automatically
  const day = format(bookingDate, "EEEE").toUpperCase(); // MONDAY, TUESDAY...

  // Get attraction with schedules & slots (match by day)
  const attraction = await prisma.attraction.findUnique({
    where: { id: attractionId },
    select: {
      id: true,
      attractionName: true,
      partnerId: true,
      attractionAdultPrice: true,
      attractionChildPrice: true,
      vat: true,
      discount: true,
      category: true,
      attractionSchedule: {
        where: { day },
        include: { slots: true },
      },
    },
  });

  if (!attraction) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  }

  // Check schedule exists for that day
  if (
    !attraction.attractionSchedule ||
    attraction.attractionSchedule.length === 0
  ) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `No schedule found for day ${day}`
    );
  }

  const schedule = attraction.attractionSchedule[0];

  // Find matching slot
  const slot = schedule.slots.find((s) => s.from === from);
  if (!slot) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Selected slot ${from} not available`
    );
  }

  // Calculate total price
  let totalPrice =
    adults * (attraction.attractionAdultPrice || 0) +
    children * (attraction.attractionChildPrice || 0);

  if (attraction.vat) totalPrice += (totalPrice * attraction.vat) / 100;
  if (attraction.discount)
    totalPrice -= (totalPrice * attraction.discount) / 100;

  // Create booking
  const booking = await prisma.attraction_Booking.create({
    data: {
      userId,
      attractionId,
      partnerId: attraction.partnerId!,
      adults,
      children,
      date,
      day,
      timeSlot: { from: slot.from, to: slot.to },
      category: attraction.category as string,
      totalPrice,
      bookingStatus: BookingStatus.PENDING,
    },
  });

  const overlappingBookings = (
    await prisma.attraction_Booking.findMany({
      where: {
        id: { not: booking.id },
        attractionId: booking.attractionId,
        day: booking.day,
      },
    })
  ).filter((b) => {
    if (!b.timeSlot) return false;

    const slotData = b.timeSlot as { from: string; to: string };
    const slotFrom = parseTime(slotData.from);
    const slotTo = parseTime(slotData.to);

    const newSlotData = booking.timeSlot as { from: string; to: string };
    const newFrom = parseTime(newSlotData.from);
    const newTo = parseTime(newSlotData.to);

    return newFrom < slotTo && newTo > slotFrom; // overlap check
  });

  // jodi overlapping hoy tahole ami jeta booking koresi thik setai delete korbo and message dibo schedule not found
  if (overlappingBookings.length > 0) {
    await prisma.attraction_Booking.delete({ where: { id: booking.id } });
    throw new ApiError(httpStatus.BAD_REQUEST, "Schedule not found");
  }

  return booking;
};

// get all attraction bookings
const getAllAttractionBookings = async (partnerId: string) => {
  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
    include: {
      attraction: {
        select: {
          id: true,
          attractionName: true,
        },
      },
    },
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
    where: { userId: findUser.id, bookingStatus: BookingStatus.CONFIRMED },
    include: {
      attraction: {
        select: {
          id: true,
          attractionName: true,
          attractionAdultPrice: true,
          attractionImages: true,
          attractionAddress: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
      payment: {
        where: { status: PaymentStatus.PAID },
        select: {
          id: true,
          provider: true,
          status: true,
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
