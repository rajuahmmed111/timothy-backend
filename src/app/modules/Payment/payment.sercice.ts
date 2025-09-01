import { JwtPayload } from "jsonwebtoken";

// stripe account onboarding
const stripeAccountOnboarding = async (userData: JwtPayload) => {};

export const PaymentService = {
  stripeAccountOnboarding,
};
