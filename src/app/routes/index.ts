import express from "express";

import { authRoutes } from "../modules/Auth/auth.routes";
import { subscriptionRoute } from "../modules/subscriptions/subscriptions.route";
import { userRoute } from "../modules/User/user.route";
import { privacyPolicyRoute } from "../modules/Privacy_Policy/policy.route";

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
    path: "/subscription",
    route: subscriptionRoute,
  },
  {
    path: "/policy",
    route: privacyPolicyRoute,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
