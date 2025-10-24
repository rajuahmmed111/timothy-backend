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
    bookingModel: any;
    serviceModel: any;
    bookingToServiceField: string; // 👈 Added new field
    serviceTypeField: string; // for payment create
    nameField: string;
    partnerIdField: string;
  }
> = {
  CAR: {
    bookingModel: prisma.car_Booking,
    serviceModel: prisma.car,
    bookingToServiceField: "carId",
    serviceTypeField: "car_bookingId",
    nameField: "carName",
    partnerIdField: "partnerId",
  },
  HOTEL: {
    bookingModel: prisma.hotel_Booking,
    serviceModel: prisma.room,
    bookingToServiceField: "roomId",
    serviceTypeField: "hotel_bookingId",
    nameField: "hotelName",
    partnerIdField: "partnerId",
  },
  SECURITY: {
    bookingModel: prisma.security_Booking,
    serviceModel: prisma.security_Guard,
    bookingToServiceField: "security_GuardId",
    serviceTypeField: "security_bookingId",
    nameField: "securityName",
    partnerIdField: "partnerId",
  },
  ATTRACTION: {
    bookingModel: prisma.attraction_Booking,
    serviceModel: prisma.appeal,
    bookingToServiceField: "appealId",
    serviceTypeField: "attraction_bookingId",
    nameField: "attractionName",
    partnerIdField: "partnerId",
  },
};

export const countryCurrencyMap: Record<string, string> = {
  // -------- USD --------
  United_States: "usd", // United States
  Puerto_Rico: "usd", // Puerto Rico
  Guam: "usd", // Guam
  Northern_Mariana_Islands: "usd", // Northern Mariana Islands
  American_Samoa: "usd", // American Samoa
  US_Virgin_Islands: "usd", // U.S. Virgin Islands
  Ecuador: "usd", // Ecuador
  El_Salvador: "usd", // El Salvador
  Panama: "usd", // Panama
  East_Timor: "usd", // Timor-Leste
  Zimbabwe: "usd", // Zimbabwe
  Cambodia: "usd", // Cambodia
  Liberia: "usd", // Liberia
  Micronesia: "usd", // Micronesia
  Marshall_Islands: "usd", // Marshall Islands
  Palau: "usd", // Palau

  // -------- EUR --------
  Austria: "eur", // Austria
  Belgium: "eur", // Belgium
  Cyprus: "eur", // Cyprus
  Estonia: "eur", // Estonia
  Finland: "eur", // Finland
  France: "eur", // France
  Germany: "eur", // Germany
  Greece: "eur", // Greece
  Ireland: "eur", // Ireland
  Italy: "eur", // Italy
  Latvia: "eur", // Latvia
  Lithuania: "eur", // Lithuania
  Luxembourg: "eur", // Luxembourg
  Malta: "eur", // Malta
  Netherlands: "eur", // Netherlands
  Portugal: "eur", // Portugal
  Slovakia: "eur", // Slovakia
  Slovenia: "eur", // Slovenia
  Spain: "eur", // Spain

  // -------- GBP --------
  United_Kingdom: "gbp", // United Kingdom
  Isle_of_Man: "gbp", // Isle of Man
  Jersey: "gbp", // Jersey
  Guernsey: "gbp", // Guernsey
};

export const zeroDecimalCurrencies: Record<string, string> = {
  bif: "Burundi Franc (BIF)",
  clp: "Chilean Peso (CLP)",
  djf: "Djiboutian Franc (DJF)",
  gnf: "Guinean Franc (GNF)",
  jpy: "Japanese Yen (JPY)",
  kmf: "Comorian Franc (KMF)",
  krw: "South Korean Won (KRW)",
  mga: "Malagasy Ariary (MGA)",
  pyg: "Paraguayan Guaraní (PYG)",
  rwf: "Rwandan Franc (RWF)",
  ugx: "Ugandan Shilling (UGX)",
  vnd: "Vietnamese Dong (VND)",
  vuv: "Vanuatu Vatu (VUV)",
  xaf: "Central African CFA Franc (XAF)",
  xof: "West African CFA Franc (XOF)",
  xpf: "CFP Franc (XPF)",
};

// https://243102737055.signin.aws.amazon.com/console
// Raju

// ytZ9W_RU

// raju@2025#

// Fasify

// mMSEJIS5OMmZt3LV

// mongodb+srv://Fasify:<db_password>@cluster0.lzu6ggj.mongodb.net/?appName=Cluster0