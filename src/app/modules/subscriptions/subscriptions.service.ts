// import { PaymentProvider } from "@prisma/client";
// import prisma from "../../../shared/prisma";
// import { stripeService } from "./stripe/stripe.service";
// import httpStatus from "http-status";
// import ApiError from "../../../errors/ApiErrors";
// import {
//   CancelSubscriptionPayload,
//   CreatePlanPayload,
//   UpdateSubscriptionPlanPayload,
// } from "./subscription.interface";
// import stripe from "../../../helpars/stripe";
// import Stripe from "stripe";
// import config from "../../../config";

// // create subscriptions
// const createSubscription = async (userId: string, planId: string) => {
//   const user = await prisma.user.findUnique({ where: { id: userId } });
//   const plan = await prisma.subscriptionPlan.findUnique({
//     where: { id: planId },
//   });

//   if (!user || !plan)
//     throw new ApiError(httpStatus.NOT_FOUND, "User or plan not found");

//   // Create Stripe customer if not already
//   let stripeCustomerId = user.stripeCustomerId;
//   if (!stripeCustomerId) {
//     const customer = await stripe.customers.create({
//       email: user.email,
//       name: user.fullName,
//     });
//     stripeCustomerId = customer.id;
//     await prisma.user.update({
//       where: { id: userId },
//       data: { stripeCustomerId },
//     });
//   }

//   // Create subscription
//   const subscription = await stripe.subscriptions.create({
//     customer: stripeCustomerId,
//     items: [{ price: plan.stripePriceId! }],
//     payment_behavior: "default_incomplete",
//     expand: ["latest_invoice.payment_intent"],
//   });

//   const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
//   const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;

//   // Store subscription
//   const savedSubscription = await prisma.subscription.create({
//     data: {
//       userId,
//       planId,
//       stripeSubscriptionId: subscription.id,
//       stripePriceId: plan.stripePriceId!,
//       status: SubscriptionStatus.ACTIVE,
//       cancelAtPeriodEnd: subscription.cancel_at_period_end,
//       endDate: new Date(subscription.current_period_end * 1000),
//       paymentProvider: PaymentProvider.STRIPE,
//     },
//     include: { plan: true },
//   });

//   return {
//     clientSecret: paymentIntent.client_secret,
//     subscriptionId: savedSubscription.id,
//   };
// };

// // checkout session
// const checkoutSession = async (
//   userId: string,
//   price: number,
//   subscriptionId: string,
//   description: string
// ) => {
//   // validation user
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//   });
//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "user not found");
//   }

//   // validation subscription
//   const subscription = await prisma.subscription.findUnique({
//     where: { id: subscriptionId },
//   });
//   if (
//     !subscription?.planId ||
//     subscription.status !== SubscriptionStatus.ACTIVE ||
//     subscription.userId !== userId
//   ) {
//     throw new ApiError(httpStatus.NOT_FOUND, "subscription not found");
//   }

//   const sessionStripe: any = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     line_items: [
//       {
//         price_data: {
//           currency: "usd",
//           product_data: {
//             name: "subscription services",
//             description: description,
//             metadata: {
//               userId: userId,
//             },
//           },
//           unit_amount: Math.round(price * 100),
//         },
//         quantity: 1,
//       },
//     ],
//     metadata: {
//       subscriptionId: subscriptionId,
//       userId: userId,
//     },
//     mode: "payment",
//     success_url: `${config.frontend_url}/success?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `${config.frontend_url}/cancel`,
//   });

//   return {
//     checkoutUrl: sessionStripe.url,
//     sessionId: sessionStripe.id,
//   };
// };

// const cancelSubscription = async (payload: CancelSubscriptionPayload) => {
//   const user = await prisma.user.findUnique({
//     where: { email: payload.email },
//     include: {
//       subscription: true,
//     },
//   });

//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "user not found");
//   }

//   if (!user.subscription || user.subscription.status !== "ACTIVE") {
//     throw new ApiError(httpStatus.NOT_FOUND, "No active subscription found");
//   }

//   try {
//     if (user.subscription.paymentProvider === "STRIPE") {
//       await stripeService.cancelSubscription(
//         user.subscription.stripeSubscriptionId!
//       );
//     }

//     // Update subscription status
//     await prisma.subscription.update({
//       where: { id: user.subscription.id },
//       data: { status: SubscriptionStatus.CANCELED },
//     });

//     // Reset users plan to FREE
//     await prisma.user.update({
//       where: { id: user.id },
//       data: { plan: Plan.DEFAULT },
//     });

//     return {
//       message: "Subscription cancelled successfully",
//     };
//   } catch (error) {
//     throw new ApiError(
//       httpStatus.INTERNAL_SERVER_ERROR,
//       "Error cancelling subscription: " + (error as Error).message
//     );
//   }
// };

// const updateSubscriptionPlan = async (
//   payload: UpdateSubscriptionPlanPayload
// ) => {
//   const user = await prisma.user.findUnique({
//     where: { email: payload.email },
//     include: {
//       subscription: true,
//     },
//   });

//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "user not found");
//   }

//   if (!user.subscription || user.subscription.status !== "ACTIVE") {
//     throw new ApiError(httpStatus.BAD_REQUEST, "No active subscription found");
//   }

//   const updatedSubscription = await prisma.subscription.update({
//     where: { id: user.subscription.id },
//     data: {
//       plan: {
//         connect: {
//           id: payload.newPlan, // should be a valid  SubscriptionPlan.id
//         },
//       },
//       updatedAt: new Date(),
//     },
//   });

//   return updatedSubscription;
// };

// const getAllPlans = async () => {
//   const plans = await prisma.subscriptionPlan.findMany({
//     where: { isActive: true },
//     orderBy: { price: "asc" },
//   });
//   return plans;
// };

// const getPlanById = async (planId: Plan) => {
//   const plan = await prisma.subscriptionPlan.findUnique({
//     where: { planId },
//   });

//   if (!plan) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
//   }

//   return plan;
// };

// const getActivePlan = async (email: string) => {
//   const user = await prisma.user.findUnique({
//     where: { email },
//     include: {
//       subscription: true,
//     },
//   });

//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "user not found");
//   }

//   if (!user.subscription || user.subscription.status !== "ACTIVE") {
//     return {
//       currentPlan: await getPlanById(user.plan),
//       subscription: null,
//     };
//   }

//   return {
//     currentPlan: await getPlanById(user.plan),
//     subscription: user.subscription,
//   };
// };

// const createSubscriptionPlan = async (
//   payload: CreatePlanPayload,
//   adminId?: string
// ) => {
//   const adminInfo = await prisma.user.findUnique({
//     where: { id: adminId },
//   });
//   if (!adminInfo) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
//   }

//   try {
//     const {
//       planType,
//       amount,
//       description,
//       list,
//       currency,
//       interval,
//       intervalCount,
//     } = payload;
//     // Create plan in Stripe
//     const stripePlan = await stripeService.createOrUpdatePlan(
//       planType as Plan,
//       {
//         name: `${planType}`,
//         features: list,
//         price: amount,
//         currency: currency,
//         interval: interval,
//         intervalCount: intervalCount,
//       }
//     );

//     // Save plan to database
//     const plan = await prisma.subscriptionPlan.upsert({
//       where: { planId: planType as Plan },
//       update: {
//         name: `${planType} Plan`,
//         description: description,
//         price: amount,
//         interval: interval,
//         features: list,
//         currency: currency,
//         stripeProductId: stripePlan.product.id,
//         stripePriceId: stripePlan.price.id,
//         isActive: true,
//         updatedAt: new Date(),
//         adminId: adminInfo.id,
//       },
//       create: {
//         planId: planType as Plan,
//         name: `${planType} Plan`,
//         description: description,
//         price: amount,
//         interval: interval,
//         features: list,
//         currency: currency,
//         stripeProductId: stripePlan.product.id,
//         stripePriceId: stripePlan.price.id,
//         isActive: true,
//         adminId: adminInfo.id,
//       },
//     });

//     return {
//       success: true,
//       message: "Subscription plan created successfully",
//       plan,
//     };
//   } catch (error: any) {
//     throw new ApiError(
//       httpStatus.INTERNAL_SERVER_ERROR,
//       "Error creating subscription plan: " + error.message
//     );
//   }
// };

// export const subscriptionPlanService = {
//   createSubscription,
//   cancelSubscription,
//   updateSubscriptionPlan,
//   getAllPlans,
//   getPlanById,
//   getActivePlan,
//   createSubscriptionPlan,
//   checkoutSession,
// };
