import { PaymentStatus } from "@prisma/client";

export const mapStripeStatusToPaymentStatus = (
  stripeStatus: string
): PaymentStatus => {
  switch (stripeStatus) {
    case "unpaid":
      return PaymentStatus.UNPAID;
    case "paid":
      return PaymentStatus.PAID;
    case "no_payment_required":
      return PaymentStatus.PAID;
    case "refunded":
    case "partially_refunded":
      return PaymentStatus.REFUNDED;
    default:
      return PaymentStatus.UNPAID;
  }
};
