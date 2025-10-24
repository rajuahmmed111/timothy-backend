import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { parse, startOfDay, isBefore, format } from "date-fns";

// create attraction booking
const createAttractionBooking = async (
  userId: string,
  appealId: string,
  data: {
    adults: number;
    children: number;
    date: string; // "2025-08-12"
    from: string; // "10:00:00"
  }
) => {
  const { adults, children, date, from } = data;

  // validate required fields
  if (adults == null || children == null || !date || !from) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Missing required booking fields"
    );
  }

  // convert date & time
  const bookingDate = parse(date, "yyyy-MM-dd", new Date());
  const today = startOfDay(new Date());
  const now = new Date();

  if (isBefore(bookingDate, today)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot book for past dates");
  }

  // same-day past time check
  if (bookingDate.getTime() === today.getTime()) {
    const [hours, minutes, seconds] = from.split(":").map(Number);
    const bookingTime = new Date(today);
    bookingTime.setHours(hours, minutes, seconds, 0);

    // if (isBefore(bookingTime, now)) {
    //   throw new ApiError(
    //     httpStatus.BAD_REQUEST,
    //     "Cannot book for past time slots today"
    //   );
    // }
  }

  // get day from date automatically
  const day = format(bookingDate, "EEEE").toUpperCase(); // MONDAY, TUESDAY...

  // get attraction with schedules & slots (match by day)
  const attraction = await prisma.appeal.findUnique({
    where: { id: appealId },
    select: {
      id: true,
      partnerId: true,
      attractionAdultPrice: true,
      attractionChildPrice: true,
      vat: true,
      discount: true,
      category: true,
      attractionId: true,
      attractionSchedule: {
        where: { appealId },
        include: { slots: true },
      },
      attraction: {
        select: {
          attractionName: true,
        },
      },
    },
  });
  // console.log(attraction, "attraction");
  // console.log(JSON.stringify(attraction, null, 2));

  if (!attraction) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  }

  // check schedule exists for that day
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
  // console.log(schedule, "schedule");

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

  // if (attraction.vat) totalPrice += (totalPrice * attraction.vat) / 100;
  if (attraction.discount)
    totalPrice -= (totalPrice * attraction.discount) / 100;

  // create booking
  const booking = await prisma.attraction_Booking.create({
    data: {
      userId,
      appealId,
      attractionId: attraction.attractionId!,
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
      appeal: {
        select: {
          id: true,
          attractionAdultPrice: true,
          attractionChildPrice: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
      attraction: {
        select: {
          attractionName: true,
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
      appeal: {
        select: {
          id: true,
          attractionAdultPrice: true,
          attractionImages: true,
          attractionAddress: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
      attraction: {
        select: {
          id: true,
          attractionName: true,
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
