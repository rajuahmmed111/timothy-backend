import { BookingStatus, EveryServiceStatus, UserStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { differenceInDays, parse } from "date-fns";
import { ISecurityBookingData } from "./security_booking.interface";

// create security booking
const createSecurityBooking = async (
  userId: string,
  securityId: string,
  data: ISecurityBookingData
) => {
  const { number_of_security, bookedFromDate, bookedToDate } = data;

  // validate user
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found or inactive");
  }

  // validate security
  const security = await prisma.security_Protocol.findUnique({
    where: { id: securityId, isBooked: EveryServiceStatus.AVAILABLE },
    select: {
      securityPriceDay: true,
      partnerId: true,
      discount: true,
      vat: true,
    },
  });
  if (!security) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Security service not found or unavailable"
    );
  }

  // Validate required fields
  if (!number_of_security || !bookedFromDate || !bookedToDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing required fields");
  }

  if (number_of_security <= 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Number of security must be greater than zero"
    );
  }

  // Calculate booking days
  const fromDate = parse(bookedFromDate, "dd-MM-yyyy", new Date());
  const toDate = parse(bookedToDate, "dd-MM-yyyy", new Date());
  const numberOfDays = differenceInDays(toDate, fromDate);

  if (numberOfDays <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid booking date range");
  }

  // Base price calculation
  let totalPrice =
    security.securityPriceDay * number_of_security * numberOfDays;

  // discount if available (percentage)
  if (security.discount && security.discount > 0) {
    totalPrice -= (totalPrice * security.discount) / 100;
  }

  // VAT if available (percentage)
  if (security.vat && security.vat > 0) {
    totalPrice += (totalPrice * security.vat) / 100;
  }

  // Create booking
  const result = await prisma.security_Booking.create({
    data: {
      ...data,
      totalPrice,
      bookingStatus: BookingStatus.PENDING,
      partnerId: security.partnerId,
      userId,
      securityId,
    },
  });

  return result;
};

export const SecurityBookingService = {
  createSecurityBooking,
};
