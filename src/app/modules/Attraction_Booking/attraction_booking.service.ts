import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { EveryServiceStatus } from "@prisma/client";

// create attraction booking
const createAttractionBooking = async (
  userId: string,
  attractionId: string,
  //   data: IAttractionBookingData
  data: any
) => {
  // const { bookedFromDate, bookedToDate, adults, children } = data;

  // const user = await prisma.user.findUnique({
  //   where: { id: userId },
  // });
  // if (!user) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  // }

  // const attraction = await prisma.attraction.findUnique({
  //   where: { id: attractionId, isBooked: EveryServiceStatus.AVAILABLE },
  //   // select: {
  //   //   attractionPriceDay: true,
  //   //   partnerId: true,
  //   //   discount: true,
  //   //   vat: true,
  //   //   category: true,
  //   // },
  //   include: {
  //     attractionSchedule: {
  //       include: {
  //         slots: true,
  //       },
  //     },
  //   },
  // });
  // if (!attraction) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "Attraction not found");
  // }

  // if (!bookedFromDate || !bookedToDate || !adults || !children) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, "Missing required fields");
  // }

  // const attractionBooking = await prisma.attraction_Booking.create({
  //   data: {
  //     userId: user.id,
  //     attractionId,
  //     bookedFromDate,
  //     bookedToDate,
  //     adults,
  //     children,
  //   },
  // });
  // return attractionBooking;
};

export const AttractionBookingService = {
  createAttractionBooking,
};
