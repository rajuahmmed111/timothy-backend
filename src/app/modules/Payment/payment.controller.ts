import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { PaymentService } from "./payment.sercice";
import { IFlutterwaveSubAccountData, IPaymentData } from "./payment.interface";

// initiate payment
const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const { bookingId } = req.params;
  const paymentData: IPaymentData = req.body;

  const result = await PaymentService.initiatePayment(
    userId,
    bookingId,
    paymentData
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.requiresOnboarding
      ? "Service provider needs to complete onboarding first"
      : "Payment initiated successfully",
    data: result,
  });
});

// handle payment webhook from Flutterwave
const handlePaymentWebhook = catchAsync(async (req: Request, res: Response) => {
  const webhookSignature = req.headers["verif-hash"] as string;
  const webhookData = req.body;

  const result = await PaymentService.handlePaymentWebhook(
    webhookData,
    webhookSignature
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment webhook processed successfully",
    data: result,
  });
});

// handle sub-account webhook from Flutterwave
const handleSubAccountWebhook = catchAsync(
  async (req: Request, res: Response) => {
    const webhookSignature = req.headers["verif-hash"] as string;
    const webhookData = req.body;

    const result = await PaymentService.handleSubAccountWebhook(
      webhookData,
      webhookSignature
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sub-account webhook processed successfully",
      data: result,
    });
  }
);

// handle payment callback from Flutterwave
const handlePaymentCallback = catchAsync(
  async (req: Request, res: Response) => {
    const callbackData = req.body;

    const result = await PaymentService.handlePaymentCallback(callbackData);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment callback processed successfully",
      data: result,
    });
  }
);

// get payment status
const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  const result = await PaymentService.getPaymentStatus(bookingId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment status retrieved successfully",
    data: result,
  });
});

// create Flutterwave sub-account for service provider
const createSubAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const subAccountData: IFlutterwaveSubAccountData = req.body;

  const result = await PaymentService.createSubAccount(userId, subAccountData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sub-account creation initiated successfully",
    data: result,
  });
});

// get sub-account status
const getSubAccountStatus = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await PaymentService.getSubAccountStatus(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sub-account status retrieved successfully",
    data: result,
  });
});

// handle sub-account callback
const handleSubAccountCallback = catchAsync(
  async (req: Request, res: Response) => {
    const callbackData = req.body;

    const result = await PaymentService.handleSubAccountCallback(callbackData);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sub-account callback processed successfully",
      data: result,
    });
  }
);

export const PaymentController = {
  initiatePayment,
  handlePaymentWebhook,
  handleSubAccountWebhook,
  handlePaymentCallback,
  getPaymentStatus,
  createSubAccount,
  getSubAccountStatus,
  handleSubAccountCallback,
};
