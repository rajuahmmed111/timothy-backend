import { Review } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { startOfDay, endOfDay } from "date-fns";

// create hotel review
const createHotelReview = async (
  userId: string,
  roomId: string,
  rating: number,
  comment?: string
): Promise<Review> => {
  // const todayStart = startOfDay(new Date());
  // const todayEnd = endOfDay(new Date());

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // check if user has already rated this hotel
  // const existingDailyRating = await prisma.review.findFirst({
  //   where: {
  //     userId: user.id,
  //     roomId,
  //     createdAt: {
  //       gte: todayStart,
  //       lte: todayEnd,
  //     },
  //   },
  // });
  // if (existingDailyRating) {
  //   throw new ApiError(
  //     httpStatus.CONFLICT,
  //     "You have already rated this hotel today."
  //   );
  // }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      roomId,
      rating,
      comment,
    },
  });

  const ratings = await prisma.review.findMany({
    where: {
      roomId,
    },
    select: {
      rating: true,
    },
  });

  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  await prisma.room.update({
    where: { id: roomId },
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
  security_GuardId: string,
  rating: number,
  comment?: string
): Promise<Review> => {
  // const todayStart = startOfDay(new Date());
  // const todayEnd = endOfDay(new Date());

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // check if user has already rated this security
  // const existingDailyRating = await prisma.review.findFirst({
  //   where: {
  //     userId: user.id,
  //     securityId,
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

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      security_GuardId,
      rating,
      comment,
    },
  });

  const ratings = await prisma.review.findMany({
    where: {
      security_GuardId,
    },
    select: {
      rating: true,
    },
  });

  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  await prisma.security_Guard.update({
    where: { id: security_GuardId },
    data: {
      securityRating: averageRating.toFixed(1),
      securityReviewCount: ratings.length,
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  // check if user has already rated this security
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

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      carId,
      rating,
      comment,
    },
  });
  const ratings = await prisma.review.findMany({
    where: {
      carId,
    },
    select: {
      rating: true,
    },
  });
  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  await prisma.car_Rental.update({
    where: { id: carId },
    data: {
      carRating: averageRating.toFixed(1),
      carReviewCount: ratings.length,
    },
  });
  return review;
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // check if user has already rated this security
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

  // generate subRatings
  const subRatings = {
    goodValue: parseFloat((rating + (Math.random() * 0.2 - 0.1)).toFixed(1)),
    quality: parseFloat((rating + (Math.random() * 0.2 - 0.1)).toFixed(1)),
    facilities: parseFloat((rating + (Math.random() * 0.2 - 0.1)).toFixed(1)),
    easeOfAccess: parseFloat((rating + (Math.random() * 0.2 - 0.1)).toFixed(1)),
  };

  // create review
  const review = await prisma.review.create({
    data: {
      userId,
      attractionId,
      rating,
      comment,
      subRatings,
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      userId: true,
      attractionId: true,
      subRatings: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const ratings = await prisma.review.findMany({
    where: {
      attractionId,
    },
    select: {
      rating: true,
    },
  });

  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  await prisma.attraction.update({
    where: { id: attractionId },
    data: {
      attractionRating: averageRating.toFixed(1),
      attractionReviewCount: ratings.length,
    },
  });

  return review;
};

export const ReviewService = {
  createHotelReview,
  createSecurityReview,
  createCarReview,
  createAttractionReview,
};
