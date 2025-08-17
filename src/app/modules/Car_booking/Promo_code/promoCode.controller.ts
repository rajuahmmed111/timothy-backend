import { Request, Response } from "express";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../../shared/sendResponse";
import httpStatus from "http-status";
import { PromoCodeService } from "./promoCode.service";

// create promo code only for admin
const createPromoCode = catchAsync(async (req: Request, res: Response) => {
    const result = await PromoCodeService.createPromoCode(req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Promo Code created successfully",
      data: result,
    });
})

export const PromoCodeController = {
    createPromoCode
}