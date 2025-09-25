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

export type ServiceType = "CAR" | "HOTEL" | "SECURITY" | "ATTRACTION";

export const serviceConfig: Record<
  ServiceType,
  {
    bookingModel: any; // use correct Prisma delegate type
    serviceModel: any;
    serviceTypeField: string;
    nameField: string;
    partnerIdField: string;
  }
> = {
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

export const countryCurrencyMap: Record<string, string> = {
  // -------- USD --------
  United_States: "usd",       // United States
  Puerto_Rico: "usd",         // Puerto Rico
  Guam: "usd",                // Guam
  Northern_Mariana_Islands: "usd", // Northern Mariana Islands
  American_Samoa: "usd",      // American Samoa
  US_Virgin_Islands: "usd", // U.S. Virgin Islands
  Ecuador: "usd",             // Ecuador
  El_Salvador: "usd",         // El Salvador
  Panama: "usd",              // Panama
  East_Timor: "usd",          // Timor-Leste
  Zimbabwe: "usd",            // Zimbabwe
  Cambodia: "usd",            // Cambodia
  Liberia: "usd",             // Liberia
  Micronesia: "usd",          // Micronesia
  Marshall_Islands: "usd",    // Marshall Islands
  Palau: "usd",               // Palau

  // -------- EUR --------
  Austria: "eur",        // Austria
  Belgium: "eur",        // Belgium
  Cyprus: "eur",         // Cyprus
  Estonia: "eur",        // Estonia
  Finland: "eur",        // Finland
  France: "eur",         // France
  Germany: "eur",        // Germany
  Greece: "eur",         // Greece
  Ireland: "eur",        // Ireland
  Italy: "eur",          // Italy
  Latvia: "eur",         // Latvia
  Lithuania: "eur",      // Lithuania
  Luxembourg: "eur",     // Luxembourg
  Malta: "eur",          // Malta
  Netherlands: "eur",    // Netherlands
  Portugal: "eur",       // Portugal
  Slovakia: "eur",       // Slovakia
  Slovenia: "eur",       // Slovenia
  Spain: "eur",          // Spain

  // -------- GBP --------
  United_Kingdom: "gbp",       // United Kingdom
  Isle_of_Man: "gbp",          // Isle of Man
  Jersey: "gbp",               // Jersey
  Guernsey: "gbp",             // Guernsey
};
