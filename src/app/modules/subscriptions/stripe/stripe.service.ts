import Stripe from "stripe";
import { Plan, UserStatus } from "@prisma/client";
import prisma from "../../../../shared/prisma";
import config from "../../../../config";
import ApiError from "../../../../errors/ApiErrors";
import httpStatus from "http-status";

const stripe = new Stripe(config.stripe.secretKey as string, {
  apiVersion: "2025-02-24.acacia",
});

const PLAN_PRICES: Record<Plan, number | null> = {
  DEFAULT: null,
  // FREE: null,
  MONTHLY: 7.99,
  // PRO: 26.99,
  ANNUAL: 79.99,
};

interface PlanDetails {
  name: string;
  features: string[];
  price: number;
  currency: string;
  interval: string | any;
  intervalCount?: number;
}

// stripe account onboarding
const createStripeAccount = async (user: any) => {
  try {
    // user validation
    const userData = await prisma.user.findUnique({
      where: { id: user.id, status: UserStatus.ACTIVE },
      select: { id: true, email: true, fullName: true, stripeCustomerId: true },
    });
    if (!userData) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    // const account = await stripe.accounts.retrieve(userData?.stripeCustomerId);


  } catch (error: any) {
    console.log(error);
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "create Connected Account And Onboarding Link IntoDb server server unavalable",
      ""
    );
  }
};

const createCustomer = async (email: string, name: string) => {
  const customer = await stripe.customers.create({
    email,
    name,
  });
  return customer;
};

const createSubscription = async (
  email: string,
  name: string,
  planId: Plan,
  paymentMethodId: string
) => {
  try {
    // Validate inputs
    if (!email) {
      throw new Error("Email is required");
    }
    if (!paymentMethodId) {
      throw new Error("Payment Method ID is required");
    }

    // Create or retrieve customer
    let customer;
    try {
      // First, try to find existing customer
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        console.log("Existing customer found:", customer.id);
      } else {
        // Create new customer if not exists
        customer = await stripe.customers.create({
          email: email,
          name: name,
        });
        console.log("New customer created:", customer.id);
      }
    } catch (customerError: any) {
      console.error("Error finding/creating customer:", customerError);
      throw new Error(`Customer creation failed: ${customerError.message}`);
    }

    console.log("Attaching payment method to customer");
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { planId: planId },
    });

    if (!plan || !plan.stripePriceId) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Plan not found or Stripe Price ID is missing"
      );
    }

    // Use the Stripe Price Object ID
    const stripePriceId = plan.stripePriceId;

    // Create subscription
    const subscription: any = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: stripePriceId }], // Use Stripe Price Object ID
      expand: ["latest_invoice.payment_intent"],
    });

    console.log("Subscription created:", subscription.id);

    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      customerId: customer.id,
    };
  } catch (error: any) {
    console.error("Stripe Subscription Creation Error:", {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorDetails: error.response?.data || error,
    });

    throw error;
  }
};

const cancelSubscription = async (subscriptionId: string) => {
  return stripe.subscriptions.cancel(subscriptionId);
};

const createOrUpdatePlan = async (planId: Plan, planDetails: PlanDetails) => {
  // console.log(planId, "planId");
  try {
    // First, create or update the product
    const product = await stripe.products.create({
      // id: `prod_${planId.toLowerCase()}`,
      name: planDetails.name,
      description: planDetails.features.join(", "),
      active: true,
    });

    // Then create the price
    const price = await stripe.prices.create({
      product: product.id,
      // Convert to cents
      unit_amount: Math.round(planDetails.price * 100),
      currency: planDetails.currency.toLowerCase(),
      recurring: {
        interval: planDetails.interval,
        interval_count: planDetails?.intervalCount
          ? planDetails.intervalCount
          : 1,
      },
      metadata: {
        plan_id: planId,
      },
    });

    return { product, price };
  } catch (error: any) {
    if (error.code === "resource_already_exists") {
      // If product exists, update it
      const product = await stripe.products.update(
        `prod_${planId.toLowerCase()}`,
        {
          name: planDetails.name,
          description: planDetails.features.join(", "),
          active: true,
        }
      );

      // Create new price (Stripe prices can't be updated)
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(planDetails.price * 100),
        currency: planDetails.currency.toLowerCase(),
        recurring: {
          interval: planDetails.interval,
          interval_count: planDetails?.intervalCount
            ? planDetails.intervalCount
            : 1,
        },
        metadata: {
          plan_id: planId,
        },
      });

      return { product, price };
    }
    throw error;
  }
};

const handleWebhook = async (event: Stripe.Event) => {
  console.log("Webhook event received:", event);
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session) {
        throw new ApiError(httpStatus.NO_CONTENT, "Session data not found", "");
      }

      if (session.payment_status !== "paid") {
        throw new ApiError(httpStatus.NO_CONTENT, "Payment not completed", "");
      }

      const mode = session.mode;
      const paymentIntentId = session.payment_intent as string;
      const stripeSessionId = session.id;
      const metadata = session.metadata || {};
      const subscriptionId = metadata.subscriptionId;

      if (!subscriptionId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Missing subscriptionId in session metadata",
          ""
        );
      }

      // Prevent duplicate records if webhook fires multiple times
      const existingPayment = await prisma.payment.findUnique({
        where: { stripeSessionId },
      });

      if (existingPayment) {
        console.log("Payment already recorded.");
        return;
      }

      // if (mode === "payment") {
      //   // One-time payment
      //   const paymentInfo = await prisma.payment.create({
      //     data: {
      //       amount: session.amount_total! / 100,
      //       currency: session.currency!,
      //       status: "SUCCESS",
      //       provider: "STRIPE",
      //       paymentIntentId,
      //       stripeSessionId,
      //       user: {
      //         connect: {
      //           id: metadata.userId,
      //         },
      //       },
      //       subscription: {
      //         connect: {
      //           id: subscriptionId,
      //         },
      //       },
      //     },
      //     include: {
      //       subscription: {
      //         include: {
      //           plan: true,
      //         },
      //       },
      //     },
      //   });

      //   const purchasedPlan = paymentInfo.subscription?.plan?.planId as Plan;

      //   if (purchasedPlan) {
      //     await prisma.user.update({
      //       where: { id: metadata.userId },
      //       data: {
      //         plan: purchasedPlan,
      //         isSubscribe: true,
      //       },
      //     });
      //   } else {
      //     console.warn("Purchased plan not found. User not updated.");
      //   }

      //   //
      // } else if (mode === "subscription") {
      // Recurring subscription payment optional logic
      const paymentInfo = await prisma.payment.create({
        data: {
          amount: session.amount_total! / 100,
          currency: session.currency!,
          status: "SUCCESS",
          provider: "STRIPE",
          paymentIntentId,
          stripeSessionId,
          user: {
            connect: {
              id: metadata.userId,
            },
          },
          subscription: {
            connect: {
              id: subscriptionId,
            },
          },
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      const purchasedPlan = paymentInfo.subscription?.plan?.planId as Plan;

      if (purchasedPlan) {
        await prisma.user.update({
          where: { id: metadata.userId },
          data: {
            plan: purchasedPlan,
            isSubscribe: true,
          },
        });
      } else {
        console.warn("Purchased plan not found. User not updated.");
      }
      // }

      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      // You can handle recurring payments here if needed
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object as Stripe.Subscription;

      const updatedSub = await prisma.subscription.update({
        where: {
          stripeSubscriptionId: stripeSubscription.id,
        },
        data: {
          status: "CANCELED",
        },
        include: {
          user: true,
        },
      });

      if (updatedSub.user?.id) {
        await prisma.user.update({
          where: { id: updatedSub.user.id },
          data: { isSubscribe: false },
        });
      }

      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }
};

export const stripeService = {
  createStripeAccount,
  createCustomer,
  createSubscription,
  cancelSubscription,
  createOrUpdatePlan,
  handleWebhook,
};
