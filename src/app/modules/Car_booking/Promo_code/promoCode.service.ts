import { DiscountType, PromoStatus } from "@prisma/client";
import { ICreatePromoCode } from "./promoCode.interface";
import prisma from "../../../../shared/prisma";
import ApiError from "../../../../errors/ApiErrors";
import httpStatus from "http-status";

// create promo code only for admin
const createPromoCode = async (data: ICreatePromoCode) => {
  const {
    code,
    discountType = DiscountType.PERCENTAGE,
    discountValue,
    validFrom,
    validTo,
    usageLimit,
    perUserLimit,
    minimumAmount,
  } = data;

  // validation
  if (!code)
    throw new ApiError(httpStatus.BAD_REQUEST, "Promo code is required");
  if (!discountValue || discountValue <= 0)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Discount value must be greater than 0"
    );
  if (!validFrom || !validTo)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "validFrom and validTo are required"
    );

  const fromDate = new Date(validFrom);
  const toDate = new Date(validTo);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()))
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid date format for validFrom/validTo"
    );

  if (fromDate >= toDate)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "validFrom must be before validTo"
    );

  if (!usageLimit || usageLimit <= 0)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Usage limit must be greater than 0"
    );
  if (!perUserLimit || perUserLimit <= 0)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Per-user limit must be greater than 0"
    );

  // Check duplicate code
  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing)
    throw new ApiError(httpStatus.CONFLICT, "Promo code already exists");

  // Create promo code
  const promo = await prisma.promoCode.create({
    data: {
      code,
      discountType,
      discountValue,
      validFrom,
      validTo,
      usageLimit,
      perUserLimit,
      minimumAmount,
      status: PromoStatus.ACTIVE,
    },
  });

  return promo;
};

export const PromoCodeService = {
  createPromoCode,
};
