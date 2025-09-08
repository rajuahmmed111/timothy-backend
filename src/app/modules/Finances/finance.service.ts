import prisma from "../../../shared/prisma";

// get all service providers finances
const getAllProvidersFinances = async (partnerId: string) => {
    const result = await prisma.payment.findMany({
        where: { partnerId },
    });
    return result;
};

export const FinanceService = {
  getAllProvidersFinances,
};
