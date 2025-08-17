import express from "express";

import { authRoutes } from "../modules/Auth/auth.routes";
// import { subscriptionRoute } from "../modules/subscriptions/subscriptions.route";
import { userRoute } from "../modules/User/user.route";
import { privacyPolicyRoute } from "../modules/Privacy_Policy/policy.route";
import { hotelRoute } from "../modules/Hotel/hotel.route";
import { reviewRoute } from "../modules/Review/review.route";
import { hotelBookingRoute } from "../modules/HotelBooking/hotelBooking.route";
import { securityProtocolRoute } from "../modules/Security_Protocol/security_protocol.route";
import { security_bookingRoute } from "../modules/Security_booking/security_booking.route";
import { carRentalRoutes } from "../modules/Car_Rental/carRental.route";
import { attractionRoute } from "../modules/Attraction/attraction.route";
import { attractionBookingRoutes } from "../modules/Attraction_Booking/attraction_booking.route";
import { promoCodeRoute } from "../modules/Car_booking/Promo_code/promoCode.route";
import { carBookingRoute } from "../modules/Car_booking/carBooking.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoute,
  },
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/hotels",
    route: hotelRoute,
  },
  {
    path: "/reviews",
    route: reviewRoute,
  },
  {
    path: "/hotel-booking",
    route: hotelBookingRoute,
  },

  {
    path: "/security-protocols",
    route: securityProtocolRoute,
  },
  {
    path: "/security-booking",
    route: security_bookingRoute,
  },
  {
    path: "/car-rentals",
    route: carRentalRoutes,
  },
  {
    path: "/promo-codes",
    route: promoCodeRoute,
  },
  {
    path: "/car-booking",
    route: carBookingRoute,
  },
  {
    path: "/attractions",
    route: attractionRoute,
  },
  {
    path: "/attraction-booking",
    route: attractionBookingRoutes,
  },

  // {
  //   path: "/subscription",
  //   route: subscriptionRoute,
  // },
  {
    path: "/policy",
    route: privacyPolicyRoute,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
