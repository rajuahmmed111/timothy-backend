import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { differenceInDays, parse } from "date-fns";
import { HotelRoomStatus } from "@prisma/client";

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
      userId: true,
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
    },
  });

  return result;
};

export const HotelBookingService = {
  createHotelBooking,
};
