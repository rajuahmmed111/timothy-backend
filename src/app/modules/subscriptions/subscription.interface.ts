import { PaymentProvider, Plan } from "@prisma/client";

export interface CreatePlanPayload {
  planType: string;
  amount: number;
  description: string;
  list: string[];
  currency: string;
  interval: "month" | "year";
  intervalCount?: number;
}

export interface CreateSubscriptionPayload {
  email: string;
  plan: Plan;
  paymentProvider: PaymentProvider;
  paymentMethodId?: string;
}

export interface CancelSubscriptionPayload {
  email: string;
}

export interface UpdateSubscriptionPlanPayload {
  email: string;
  newPlan: Plan;
}

export interface PlanDetails {
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
}

export interface PaymentDetails {
  price: number;
  subscriptionId: string;
  description?: string;
}
