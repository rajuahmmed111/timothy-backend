import prisma from "../../../shared/prisma";

// get all service providers finances
const getAllProvidersFinances = async () => {
    const result = await prisma.payment.findMany({
       
    });
    return result;
};

export const FinanceService = {
  getAllProvidersFinances,
};
