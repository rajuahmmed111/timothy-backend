import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { subscriptionPlanService } from "./subscriptions.service";
import { stripeService } from "./stripe/stripe.service";
import Stripe from "stripe";
import stripe from "../../../helpars/stripe";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";

// create stripe account
const createStripeAccount = catchAsync(async (req: Request, res: Response) => {
  const userData = req.user;
  const result = await stripeService.createStripeAccount(userData);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stripe account created successfully",
    data: result,
  });
});

// create subscription
const createSubscription = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { planId } = req.body;

  const subscription = await subscriptionPlanService.createSubscription(
    userId,
    planId
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Subscription created successfully",
    data: subscription,
  });
});

// checkout session
const checkoutSession = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { price, subscriptionId, description } = req.body;
  const result = await subscriptionPlanService.checkoutSession(
    userId,
    price,
    subscriptionId,
    description
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Checkout session created successfully",
    data: result,
  });
});

// cancel subscription
const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionPlanService.cancelSubscription(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription cancelled successfully",
    data: result,
  });
});

// Webhook handlers for payment providers
const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing stripe signature", "");
  }

  let event: Stripe.Event;
 try {
    if (!req.rawBody) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Raw body not available', '');
    }

    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      config.stripe.webhookSecret as string
    );
  } catch (err: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Webhook Error: ${err.message}`,
      '',
    );
  }

  try {
    await stripeService.handleWebhook(event);
    res.json({ received: true });
  } catch (err) {
    res.status(500).send(`Webhook processing error.`);
  }
});

// update subscription plan
const updateSubscriptionPlan = catchAsync(
  async (req: Request, res: Response) => {
    const result = await subscriptionPlanService.updateSubscriptionPlan(
      req.body
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription plan updated successfully",
      data: result,
    });
  }
);

// get all plans
const getAllPlans = catchAsync(async (req: Request, res: Response) => {
  const plans = await subscriptionPlanService.getAllPlans();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Plans retrieved successfully",
    data: plans,
  });
});

// get plan by id
const getPlanById = catchAsync(async (req: Request, res: Response) => {
  const plan = await subscriptionPlanService.getPlanById(
    req.params.planId as any
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Plan retrieved successfully",
    data: plan,
  });
});

// get active plan
const getActivePlan = catchAsync(async (req: Request, res: Response) => {
  const plan = await subscriptionPlanService.getActivePlan(req.user.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Active plan retrieved successfully",
    data: plan,
  });
});

// create subscription plan
const createSubscriptionPlan = catchAsync(
  async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    const result = await subscriptionPlanService.createSubscriptionPlan(
      req.body,
      adminId
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Subscription plan created successfully",
      data: result,
    });
  }
);

export const subscriptionController = {
  createStripeAccount,
  createSubscription,
  cancelSubscription,
  updateSubscriptionPlan,
  getAllPlans,
  getPlanById,
  getActivePlan,
  handleStripeWebhook,
  createSubscriptionPlan,
  checkoutSession,
};


// export const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
//   const sig = req.headers["stripe-signature"] as string;
//   let event: Stripe.Event;

//   if (!sig || !req.body) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "Missing signature or raw body");
//   }

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       config.stripe.webhookSecret!
//     );
//   } catch (err: any) {
//     throw new ApiError(httpStatus.BAD_REQUEST, `Webhook Error: ${err.message}`);
//   }

//   // Handle different Stripe events
//   switch (event.type) {
//     case "checkout.session.completed": {
//       const session = event.data.object as Stripe.Checkout.Session;
//       const subscriptionId = session.metadata?.subscriptionId;
//       const userId = session.metadata?.userId;

//       // await prisma.payment.create({
//       //   data: {
//       //     subscriptionId,
//       //     userId,
//       //     amount: session.amount_total! / 100,
//       //     currency: session.currency!,
//       //     status: "SUCCESS",
//       //     provider: "STRIPE",
//       //     paymentIntentId: session.payment_intent as string,
//       //   },
//       // });
//       break;
//     }

//     case "invoice.payment_succeeded": {
//       const invoice = event.data.object as Stripe.Invoice;
//       console.log("Invoice payment succeeded:", invoice.id);
//       break;
//     }

//     case "customer.subscription.deleted": {
//       const subscription = event.data.object as Stripe.Subscription;
//       await prisma.subscription.updateMany({
//         where: { stripeSubscriptionId: subscription.id },
//         data: { status: "CANCELED" },
//       });
//       break;
//     }

//     default:
//       console.log(`Unhandled event type: ${event.type}`);
//   }

//   res.status(200).json({ received: true });
// });
