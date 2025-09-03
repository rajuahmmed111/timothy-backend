import { PaymentStatus } from "@prisma/client";
import prisma from "../../../../shared/prisma";

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

export const serviceConfig = {
  CAR: {
    bookingModel: prisma.car_Booking,
    serviceModel: prisma.car_Rental,
    serviceTypeField: "car_bookingId",
    nameField: "carName",
    partnerIdField: "partnerId",
  },
  HOTEL: {
    bookingModel: prisma.hotel_Booking,
    serviceModel: prisma.hotel,
    serviceTypeField: "hotel_bookingId",
    nameField: "hotelName",
    partnerIdField: "partnerId",
  },
  SECURITY: {
    bookingModel: prisma.security_Booking,
    serviceModel: prisma.security_Protocol,
    serviceTypeField: "security_bookingId",
    nameField: "securityName",
    partnerIdField: "partnerId",
  },
  ATTRACTION: {
    bookingModel: prisma.attraction_Booking,
    serviceModel: prisma.attraction,
    serviceTypeField: "attraction_bookingId",
    nameField: "attractionName",
    partnerIdField: "partnerId",
  },
};
