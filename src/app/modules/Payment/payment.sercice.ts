import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import stripe from "../../../helpars/stripe";
import { UserStatus } from "@prisma/client";
import config from "../../../config";

// stripe account onboarding
const stripeAccountOnboarding = async (userId: string) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // if user has stripe account
  if (user.stripeAccountId) {
    const accountLinks = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${config.stripe.refreshUrl}?accountId=${user.stripeAccountId}`,
      return_url: config.stripe.returnUrl,
      type: "account_onboarding",
    });

    if (accountLinks) {
      const account = await stripe.accounts.retrieve(user.stripeAccountId);

      // capability status
      const cardPayments = account.capabilities?.card_payments;
      const transfers = account.capabilities?.transfers;

      // incomplete requirements
      const requirements = account.requirements?.currently_due || [];

      // case 1: Fully verified (active)
      if (cardPayments === "active" && transfers === "active") {
        await prisma.user.update({
          where: { id: user.id },
          data: { isStripeConnected: true },
        });

        return {
          status: "verified",
          message: "Stripe account verified successfully.",
          capabilities: account.capabilities,
        };
      }

      // case 2: verification (pending)
      if (cardPayments === "pending" || transfers === "pending") {
        return {
          status: "pending",
          message: "Your Stripe account verification is under review.",
          capabilities: account.capabilities,
        };
      }

      // case 3: inactive
      if (cardPayments === "inactive" && transfers === "inactive") {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeAccountId: null }, // unset stripeAccountId
        });

        return {
          status: "inactive",
          message:
            "Stripe account is inactive. Please complete onboarding again.",
          onboardingLink: accountLinks?.url,
        };
      }

      // case 4: requirements due
      if (requirements.length > 0) {
        return {
          status: "requirements_due",
          message: "Additional information required for Stripe verification.",
          requirements,
          onboardingLink: accountLinks.url,
        };
      }

      // default fallback
      return {
        status: "unknown",
        message: "Unable to determine Stripe account status.",
        capabilities: account.capabilities,
      };
    }
  } else {
    // case 5: no account
    return {
      status: "no_account",
      message: "User does not have a Stripe account. Please create one first.",
    };
  }

  // create stripe account
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: user?.email,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        schedule: {
          delay_days: 1,
        },
      },
    },
  });

  // onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${config.stripe.refreshUrl}?accountId=${account?.id}`,
    return_url: config.stripe.returnUrl,
    type: "account_onboarding",
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeAccountId: account.id,
      isStripeConnected: true,
      status: UserStatus.ACTIVE,
    },
  });

  return {
    status: "pending",
    message: "Your Stripe account verification is under review.",
    capabilities: account.capabilities,
    onboardingLink: accountLink?.url,
  };
};

export const PaymentService = {
  stripeAccountOnboarding,
};
