import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { differenceInDays, parse } from "date-fns";
import { BookingStatus, HotelRoomStatus } from "@prisma/client";

const createHotelBooking = async (userId: string, data: any) => {
  const { hotelId, rooms, adults, children, bookedFromDate, bookedToDate } =
    data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (
    !hotelId ||
    !rooms ||
    !adults ||
    !children ||
    !bookedFromDate ||
    !bookedToDate
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing required fields");
  }

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId, isBooked: HotelRoomStatus.AVAILABLE },
    select: {
      hotelRoomPriceNight: true,
      partnerId: true,
    },
  });

  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  // calculate number of nights
  const fromDate = parse(bookedFromDate, "dd-MM-yyyy", new Date());
  const toDate = parse(bookedToDate, "dd-MM-yyyy", new Date());

  const numberOfNights = differenceInDays(toDate, fromDate);
  //   console.log(numberOfNights, "numberOfNights");

  if (numberOfNights <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid booking date range");
  }

  // calculate total price
  const roomPrice = hotel.hotelRoomPriceNight;
  //   console.log(roomPrice, "roomPrice");
  const totalPrice = roomPrice * rooms * numberOfNights;

  const result = await prisma.hotel_Booking.create({
    data: {
      ...data,
      totalPrice,
      hotelId,
      userId,
      partnerId: hotel.partnerId,
    },
  });

  return result;
};

// get all hotel bookings
const getAllHotelBookings = async (partnerId: string) => {
  const result = await prisma.hotel_Booking.findMany({
    where: { partnerId },
    include: {
      hotel: true,
    },
  });
  return result;
};

// get my hotel bookings
const getAllMyHotelBookings = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const bookings = await prisma.hotel_Booking.findMany({
    where: { userId: user.id },
    include: {
      hotel: {
        select: {
          hotelName: true,
          hotelRoomPriceNight: true,
          hotelCountry: true,
          hotelRating: true,
        },
      },
    },
  });

  const allBookingsBelongToUser = bookings.every((booking) => {
    return booking.userId === userId;
  });

  if (!allBookingsBelongToUser || bookings.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "Bookings not found");
  }

  return bookings;
};

// get hotel booking by id
const getHotelBookingById = async (partnerId: string, bookingId: string) => {
  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, partnerId },
    include: {
      hotel: true,
    },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.hotel.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this booking"
    );
  }
  return booking;
};

// cancel my hotel booking only user
const cancelMyHotelBooking = async (
  userId: string,
  bookingId: string,
  bookingStatus: "CANCELLED"
) => {
  const findUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, userId },
    include: {
      hotel: true,
    },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.userId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this booking"
    );
  }

  const updatedBooking = await prisma.hotel_Booking.update({
    where: { id: bookingId },
    data: {
      bookingStatus,
    },
  });

  return updatedBooking;
};

// update booking status
const updateBookingStatus = async (
  partnerId: string,
  bookingId: string,
  bookingStatus: "CONFIRMED" | "CANCELLED"
) => {
  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, partnerId },
    include: {
      hotel: true,
    },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this booking"
    );
  }

  const updatedBooking = await prisma.hotel_Booking.update({
    where: { id: bookingId },
    data: {
      bookingStatus,
    },
  });

  return updatedBooking;
};

export const HotelBookingService = {
  createHotelBooking,
  getAllHotelBookings,
  getAllMyHotelBookings,
  getHotelBookingById,
  cancelMyHotelBooking,
  updateBookingStatus,
};
