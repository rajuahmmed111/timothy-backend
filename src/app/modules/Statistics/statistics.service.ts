import { UserRole } from "@prisma/client";
import prisma from "../../../shared/prisma";

// get overview total user, total partner,total contracts , admin earnings
const getOverview = async () => {
  // total users
  const totalUsers = await prisma.user.count({
    where: { role: UserRole.USER },
  });

  // total partners
  const totalPartners = await prisma.user.count({
    where: { role: UserRole.BUSINESS_PARTNER },
  });

  // total contracts
  //   const totalContracts = await prisma.contract.count();

  // admin earnings
  const adminEarnings = await prisma.payment.aggregate({
    _sum: {
      admin_commission: true,
    },
  });

  return {
    totalUsers,
    totalPartners,
    // totalContracts,
    adminEarnings: adminEarnings._sum.admin_commission,
  };
};

export const StatisticsService = { getOverview };
