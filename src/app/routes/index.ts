import express from "express";

import { authRoutes } from "../modules/Auth/auth.routes";
import { subscriptionRoute } from "../modules/subscriptions/subscriptions.route";
import { userRoute } from "../modules/User/user.route";
import { termsConditionRoute } from "../modules/Terms_Conditions/terms.route";
import { privacyPolicyRoute } from "../modules/Privacy_Policy/policy.route";
import { timberRoute } from "../modules/Timber_Species/timber.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/users",
    route: userRoute,
  },
  {
    path: "/timbers",
    route: timberRoute,
  },
  {
    path: "/subscription",
    route: subscriptionRoute,
  },
  {
    path: "/terms",
    route: termsConditionRoute,
  },
  {
    path: "/policy",
    route: privacyPolicyRoute,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
