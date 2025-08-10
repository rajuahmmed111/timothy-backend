import { EveryServiceStatus, UserStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const createSecurityBooking = (
  userId: string,
  securityId: string,
  data: any
) => {
  // validate user
  const findUser = prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // validate security
  const findSecurity = prisma.security_Protocol.findUnique({
    where: { id: securityId, isBooked: EveryServiceStatus.AVAILABLE },
    select: {
      securityPriceDay: true,
      partnerId: true,
    },
  });
  if (!findSecurity) {
    throw new ApiError(httpStatus.NOT_FOUND, "Security not found");
  }
};

export const SecurityBookingService = {
  createSecurityBooking,
};
