import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { differenceInDays, parse } from "date-fns";
import { BookingStatus, EveryServiceStatus } from "@prisma/client";
import { IHotelBookingData } from "./hotelBooking.interface";

// create hotel booking
const createHotelBooking = async (
  userId: string,
  hotelId: string,
  data: IHotelBookingData
) => {
  const { rooms, adults, children, bookedFromDate, bookedToDate } = data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId, isBooked: EveryServiceStatus.AVAILABLE },
    select: {
      hotelRoomPriceNight: true,
      partnerId: true,
      discount: true, // discount in percentage
      category: true,
    },
  });

  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  if (!rooms || !adults || !children || !bookedFromDate || !bookedToDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing required fields");
  }

  // calculate number of nights
  const fromDate = parse(bookedFromDate, "dd-MM-yyyy", new Date());
  const toDate = parse(bookedToDate, "dd-MM-yyyy", new Date());

  const numberOfNights = differenceInDays(toDate, fromDate);

  if (numberOfNights <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid booking date range");
  }

  // calculate base price
  const roomPrice = hotel.hotelRoomPriceNight;
  let totalPrice = roomPrice * rooms * numberOfNights;

  // apply discount if available
  if (hotel.discount && hotel.discount > 0) {
    totalPrice -= (totalPrice * hotel.discount) / 100;
  }

  const result = await prisma.hotel_Booking.create({
    data: {
      ...data,
      totalPrice,
      hotelId,
      userId,
      partnerId: hotel.partnerId,
      bookingStatus: BookingStatus.PENDING,
      category: hotel.category as string,
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

// get my all (hotel, security, car, attraction) bookings
const getAllMyBookings = async (authUserId: string) => {
  // Validate logged-in user exists
  const user = await prisma.user.findUnique({
    where: { id: authUserId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Fetch all booking types in parallel (only for logged-in user)
  const [
    hotelBookings,
    securityBookings /** carBookings, attractionBookings */,
  ] = await Promise.all([
    prisma.hotel_Booking.findMany({
      where: { userId: authUserId },
      include: {
        hotel: {
          select: {
            id: true,
            hotelName: true,
            hotelRoomPriceNight: true,
            hotelCountry: true,
            hotelRating: true,
            hotelRoomImages: true,
          },
        },
      },
    }),
    prisma.security_Booking.findMany({
      where: { userId: authUserId },
      include: {
        security: {
          select: {
            id: true,
            securityName: true,
            securityPriceDay: true,
            securityCountry: true,
            securityRating: true,
            securityImages: true,
          },
        },
      },
    }),
    // prisma.car_Booking.findMany({
    //   where: { userId: authUserId },
    //   include: {
    //     car: {
    //       select: {
    //         id: true,
    //         carName: true,
    //         carPriceDay: true,
    //         carType: true,
    //       },
    //     },
    //   },
    // }),
    // prisma.attraction_Booking.findMany({
    //   where: { userId: authUserId },
    //   include: {
    //     attraction: {
    //       select: {
    //         id: true,
    //         attractionName: true,
    //         ticketPrice: true,
    //         location: true,
    //       },
    //     },
    //   },
    // }),
  ]);

  // Verify all bookings belong to logged-in user
  const isValidOwner = [
    ...hotelBookings,
    ...securityBookings,
    // ...carBookings,
    // ...attractionBookings,
  ].every((booking) => booking.userId === authUserId);

  if (!isValidOwner) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not allowed to view these bookings"
    );
  }

  // If all bookings are empty
  if (
    hotelBookings.length === 0 &&
    securityBookings.length === 0 /**  &&
    carBookings.length === 0 &&
    attractionBookings.length === 0 */
  ) {
    throw new ApiError(httpStatus.NOT_FOUND, "No bookings found");
  }

  return {
    hotels: hotelBookings,
    securities: securityBookings,
    // cars: carBookings,
    // attractions: attractionBookings,
  };
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
  getAllMyBookings,
  getHotelBookingById,
  cancelMyHotelBooking,
  updateBookingStatus,
};
