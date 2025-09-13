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

// get all promo codes
const getAllPromoCodes = catchAsync(async (req: Request, res: Response) => {
    const result = await PromoCodeService.getAllPromoCodes();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Promo codes fetched successfully",
      data: result,
    });
})

// get single promo code 
const getPromoCodeById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await PromoCodeService.getPromoCodeById(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Promo code fetched successfully",
      data: result,
    });
})

// update promo code only for admin
const updatePromoCode = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await PromoCodeService.updatePromoCode(id, req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Promo code updated successfully",
      data: result,
    });
})

// delete promo code only for admin
const deletePromoCode = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await PromoCodeService.deletePromoCode(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Promo code deleted successfully",
      data: result,
    });
})

export const PromoCodeController = {
    createPromoCode,
    getAllPromoCodes,
    getPromoCodeById,
    updatePromoCode,
    deletePromoCode,
}