import {
  BookingStatus,
  EveryServiceStatus,
  PaymentStatus,
  UserStatus,
} from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { differenceInDays, parse, startOfDay } from "date-fns";
import { ISecurityBookingData } from "./security_booking.interface";

// create security booking
const createSecurityBooking = async (
  userId: string,
  security_GuardId: string,
  data: ISecurityBookingData
) => {
  const { number_of_security, securityBookedFromDate, securityBookedToDate } =
    data;

  // validate user
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!user)
    throw new ApiError(httpStatus.NOT_FOUND, "User not found or inactive");

  // validate security
  const security = await prisma.security_Guard.findUnique({
    where: { id: security_GuardId },
    select: {
      securityPriceDay: true,
      partnerId: true,
      discount: true,
      vat: true,
      category: true,
      security: {
        select: {
          securityName: true,
        },
      },
    },
  });
  if (!security)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Security service not found or unavailable"
    );

  // validate required fields
  if (!number_of_security || !securityBookedFromDate || !securityBookedToDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing required fields");
  }
  if (number_of_security <= 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Number of security must be greater than zero"
    );
  }

  const fromDate = parse(securityBookedFromDate, "yyyy-MM-dd", new Date());
  const toDate = parse(securityBookedToDate, "yyyy-MM-dd", new Date());
  const today = startOfDay(new Date());

  // check past-date booking
  if (fromDate < today) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot book for past dates");
  }

  // validate date range
  const numberOfDays = differenceInDays(toDate, fromDate);
  if (numberOfDays <= 0)
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid booking date range");

  // check overlapping bookings
  const overlappingBooking = await prisma.security_Booking.findFirst({
    where: {
      security_GuardId,
      bookingStatus: { not: BookingStatus.CANCELLED },
      OR: [
        {
          securityBookedFromDate: { lte: securityBookedToDate },
          securityBookedToDate: { gte: securityBookedFromDate },
        },
      ],
    },
  });

  if (overlappingBooking) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This security service is already booked for the selected dates"
    );
  }

  // base price calculation
  let totalPrice =
    security.securityPriceDay * number_of_security * numberOfDays;

  if (security.discount && security.discount > 0) {
    totalPrice -= (totalPrice * security.discount) / 100;
  }

  if (security.vat && security.vat > 0) {
    totalPrice += (totalPrice * security.vat) / 100;
  }

  // create booking
  const result = await prisma.security_Booking.create({
    data: {
      ...data,
      totalPrice,
      bookingStatus: BookingStatus.PENDING,
      partnerId: security.partnerId!,
      userId,
      security_GuardId,
      category: security.category as string,
    },
  });

  return result;
};

// get all security bookings
const getAllSecurityBookings = async (partnerId: string) => {
  // find partner
  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const result = await prisma.security_Booking.findMany({
    where: { partnerId },
    include: {
      security: {
        select: {
          id: true,
          securityName: true,
        },
      },
    },
  });
  if (result.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No bookings found");
  }

  return result;
};

// get single security booking
const getSingleSecurityBooking = async (id: string) => {
  const result = await prisma.security_Booking.findUnique({
    where: { id },
    include: {
      security_Guard: {
        select: {
          id: true,
          securityPriceDay: true,
        },
      },
      security: {
        select: {
          id: true,
          securityName: true,
        },
      },
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Security Booking not found");
  }

  return result;
};

// get all my security bookings
const getAllMySecurityBookings = async (userId: string) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.security_Booking.findMany({
    where: { userId, bookingStatus: BookingStatus.CONFIRMED },
    include: {
      security_Guard: {
        select: {
          id: true,
          securityPriceDay: true,
          securityImages: true,
          securityAddress: true,
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

export const SecurityBookingService = {
  createSecurityBooking,
  getAllSecurityBookings,
  getSingleSecurityBooking,
  getAllMySecurityBookings,
};
