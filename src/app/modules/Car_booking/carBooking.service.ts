import {
  BookingStatus,
  DiscountType,
  EveryServiceStatus,
  PromoStatus,
  UserStatus,
} from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { differenceInDays, parse, startOfDay } from "date-fns";
import { ICarBookingData } from "./carBooking.interface";

// create car rental booking
const createCarBooking = async (
  userId: string,
  carId: string,
  data: ICarBookingData
) => {
  const { carBookedFromDate, carBookedToDate, promo_code } = data;

  // validate user
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!user)
    throw new ApiError(httpStatus.NOT_FOUND, "User not found or inactive");

  // validate car
  const car = await prisma.car_Rental.findUnique({
    where: { id: carId },
    select: {
      carPriceDay: true,
      partnerId: true,
      discount: true,
      vat: true,
      category: true,
      carName: true,
    },
  });
  if (!car)
    throw new ApiError(httpStatus.NOT_FOUND, "Car not found or unavailable");

  // required fields
  if (!carBookedFromDate || !carBookedToDate)
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing required fields");

  const fromDate = parse(carBookedFromDate, "yyyy-MM-dd", new Date());
  const toDate = parse(carBookedToDate, "yyyy-MM-dd", new Date());
  const today = startOfDay(new Date()); // ignore time

  // prevent past-date booking
  if (fromDate < today) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot book for past dates");
  }

  // validate date range
  const numberOfDays = differenceInDays(toDate, fromDate);
  if (numberOfDays <= 0)
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid booking date range");

  // prevent overlapping bookings
  const overlappingBooking = await prisma.car_Booking.findFirst({
    where: {
      carId,
      bookingStatus: { not: BookingStatus.CANCELLED },
      OR: [
        {
          carBookedFromDate: { lte: carBookedToDate },
          carBookedToDate: { gte: carBookedFromDate },
        },
      ],
    },
  });

  if (overlappingBooking) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This car is already booked for the selected dates"
    );
  }

  // base price calculation
  let basePrice = car.carPriceDay * numberOfDays;

  // car discount (if available)
  if (car.discount && car.discount > 0) {
    basePrice -= (basePrice * car.discount) / 100;
  }

  // promo code discount (if provided)
  if (promo_code) {
    const bookingStartDate = parse(carBookedFromDate, "yyyy-MM-dd", new Date());
    const promo = await prisma.promoCode.findFirst({
      where: {
        code: promo_code,
        status: PromoStatus.ACTIVE,
        validFrom: { lte: bookingStartDate },
        validTo: { gte: bookingStartDate },
      },
    });
    if (!promo)
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Promo code not found or expired"
      );

    if (promo.minimumAmount && basePrice < promo.minimumAmount)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Minimum amount ${promo.minimumAmount} required`
      );

    if (promo.discountType === DiscountType.PERCENTAGE) {
      basePrice -= (basePrice * promo.discountValue) / 100;
    } else {
      basePrice -= promo.discountValue;
    }
  }

  // VAT calculation
  if (car.vat && car.vat > 0) {
    basePrice += (basePrice * car.vat) / 100;
  }

  const totalPrice = basePrice;

  // create booking
  const booking = await prisma.car_Booking.create({
    data: {
      totalPrice,
      bookingStatus: BookingStatus.PENDING,
      partnerId: car.partnerId,
      userId,
      carId,
      category: car.category as string,
      carBookedFromDate: data.carBookedFromDate,
      carBookedToDate: data.carBookedToDate,
      promo_code: data.promo_code as string,
    },
  });

  // Send notifications
  // const notificationData: IBookingNotificationData = {
  //   bookingId: booking.id,
  //   userId,
  //   partnerId: car.partnerId,
  //   serviceType: ServiceType.CAR,
  //   serviceName: car.carName,
  //   totalPrice,
  //   bookedFromDate: data.carBookedFromDate,
  //   bookedToDate: data.carBookedToDate,
  // };
  // BookingNotificationService.sendBookingNotifications(notificationData);

  return booking;
};

// get all car rental bookings
const getAllCarBookings = async (partnerId: string) => {
  // find partner
  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const result = await prisma.car_Booking.findMany({
    where: { partnerId },
    include: {
      car: {
        select: {
          id: true,
          carName: true,
        },
      },
    },
  });
  if (result.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No bookings found");
  }

  return result;
};

// get single car rental booking
const getSingleCarBooking = async (id: string) => {
  const result = await prisma.car_Booking.findUnique({
    where: { id },
    include: {
      car: {
        select: {
          id: true,
          carName: true,
          carPriceDay: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Security Booking not found");
  }

  return result;
};

// get all my car rental bookings
const getAllMyCarBookings = async (userId: string) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.car_Booking.findMany({
    where: { userId: user.id },
    include: {
      car: {
        select: {
          id: true,
          carName: true,
          carPriceDay: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
      payment: {
        select: {
          id: true,
          provider: true,
          status: true,
        },
      },
    },
  });
  if (result.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No bookings found");
  }

  return result;
};

export const CarRentalBookingService = {
  createCarBooking,
  getAllCarBookings,
  getSingleCarBooking,
  getAllMyCarBookings,
};
