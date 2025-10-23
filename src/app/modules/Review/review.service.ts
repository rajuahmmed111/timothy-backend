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
)=> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      hotelRating: true,
      hotelReviewCount: true,
      hotelId: true,
    },
  });
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      roomId,
      hotelId: room.hotelId,
      rating,
      comment,
    },
    select: {
      id: true,
      userId: true,
      roomId: true,
      hotelId: true,
      rating: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
    }
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

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
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

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
  await prisma.car.update({
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
  appealId: string,
  rating: number,
  comment?: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

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
      appealId,
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
      appealId,
    },
    select: {
      rating: true,
    },
  });

  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  await prisma.appeal.update({
    where: { id: appealId },
    data: {
      attractionRating: averageRating.toFixed(1),
      attractionReviewCount: ratings.length,
    },
  });

  return review;
};

// get all reviews
const getAllReviews = async () => {
  const result = await prisma.review.findMany();
  return result;
};

export const ReviewService = {
  createHotelReview,
  createSecurityReview,
  createCarReview,
  createAttractionReview,
  getAllReviews,
};
