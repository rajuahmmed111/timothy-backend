import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { PaymentService } from "./payment.sercice";

// stripe account onboarding
const stripeAccountOnboarding = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PaymentService.stripeAccountOnboarding(req.user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe account onboarding successfully",
      data: result,
    });
  }
);

export const PaymentController = {
  stripeAccountOnboarding,
};
