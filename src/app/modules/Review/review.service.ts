import { Review } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { startOfDay, endOfDay } from "date-fns";

// create hotel review
const createHotelReview = async (
  userId: string,
  hotelId: string,
  rating: number,
  comment?: string
): Promise<Review> => {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // check if user has already rated this hotel
  const existingDailyRating = await prisma.review.findFirst({
    where: {
      userId: user.id,
      hotelId,
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });
  if (existingDailyRating) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "You have already rated this hotel today."
    );
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      hotelId,
      rating,
      comment,
    },
  });

  const ratings = await prisma.review.findMany({
    where: {
      hotelId,
    },
    select: {
      rating: true,
    },
  });

  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      hotelRating: averageRating.toFixed(1),
      hotelReviewCount: ratings.length,
    },
  });

  return review;
};

// create security review
const createSecurityReview = async (
  userId: string,
  securityId: string,
  rating: number,
  comment?: string
): Promise<Review> => {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // check if user has already rated this security
  const existingDailyRating = await prisma.review.findFirst({
    where: {
      userId: user.id,
      securityId,
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });
  if (existingDailyRating) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "You have already rated this security today."
    );
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      securityId,
      rating,
      comment,
    },
  });

  const ratings = await prisma.review.findMany({
    where: {
      securityId,
    },
    select: {
      rating: true,
    },
  });

  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  await prisma.security_Protocol.update({
    where: { id: securityId },
    data: {
      securityRating: averageRating.toFixed(1),
    },
  });

  return review;
};

// create car review
const createCarReview = async (
  userId: string,
  carId: string,
  rating: number,
  comment?: string
) => {
  // const todayStart = startOfDay(new Date());
  // const todayEnd = endOfDay(new Date());
  // const user = await prisma.user.findUnique({
  //   where: { id: userId },
  // });
  // if (!user) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  // }
  // // check if user has already rated this security
  // const existingDailyRating = await prisma.review.findFirst({
  //   where: {
  //     userId: user.id,
  //     carId,
  //     createdAt: {
  //       gte: todayStart,
  //       lte: todayEnd,
  //     },
  //   },
  // });
  // if (existingDailyRating) {
  //   throw new ApiError(
  //     httpStatus.CONFLICT,
  //     "You have already rated this security today."
  //   );
  // }
  // const review = await prisma.review.create({
  //   data: {
  //     userId: user.id,
  //     carId,
  //     rating,
  //     comment,
  //   },
  // });
  // const ratings = await prisma.review.findMany({
  //   where: {
  //     carId,
  //   },
  //   select: {
  //     rating: true,
  //   },
  // });
  // // average rating calculation
  // const averageRating =
  //   ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  // await prisma.car.update({
  //   where: { id: carId },
  //   data: {
  //     carRating: averageRating.toFixed(1),
  //   },
  // });
  // return review;
};

// create attraction review
const createAttractionReview = async (
  userId: string,
  attractionId: string,
  rating: number,
  comment?: string
) => {
  // const todayStart = startOfDay(new Date());
  // const todayEnd = endOfDay(new Date());
  // const user = await prisma.user.findUnique({
  //   where: { id: userId },
  // });
  // if (!user) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  // }
  // // check if user has already rated this security
  // const existingDailyRating = await prisma.review.findFirst({
  //   where: {
  //     userId: user.id,
  //     attractionId,
  //     createdAt: {
  //       gte: todayStart,
  //       lte: todayEnd,
  //     },
  //   },
  // });
  // if (existingDailyRating) {
  //   throw new ApiError(
  //     httpStatus.CONFLICT,
  //     "You have already rated this security today."
  //   );
  // }
  // const review = await prisma.review.create({
  //   data: {
  //     userId,
  //     attractionId,
  //     rating,
  //     comment,
  //   },
  // });
  // const ratings = await prisma.review.findMany({
  //   where: {
  //     attractionId,
  //   },
  //   select: {
  //     rating: true,
  //   },
  // });
  // // average rating calculation
  // const averageRating =
  //   ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  // await prisma.attraction.update({
  //   where: { id: attractionId },
  //   data: {
  //     attractionRating: averageRating.toFixed(1),
  //   },
  // });
  // return review;
};

export const ReviewService = {
  createHotelReview,
  createSecurityReview,
  createCarReview,
  createAttractionReview,
};
