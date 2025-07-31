import { Review } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { startOfDay, endOfDay } from "date-fns";

// create review
const createReview = async (
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
    },
  });

  return review;
};

export const ReviewService = {
  createReview,
};
