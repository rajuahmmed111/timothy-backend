import { UserRole, UserStatus } from "@prisma/client";
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

  // total contracts (all bookings)
  const [hotelCount, securityCount, carCount, attractionCount] =
    await Promise.all([
      prisma.hotel_Booking.count(),
      prisma.security_Booking.count(),
      prisma.car_Booking.count(),
      prisma.attraction_Booking.count(),
    ]);

  const totalContracts =
    hotelCount + securityCount + carCount + attractionCount;

  // admin earnings
  const adminEarnings = await prisma.payment.aggregate({
    _sum: {
      admin_commission: true,
    },
  });

  // total pending partner requests
  const totalPendingPartners = await prisma.user.count({
    where: { role: UserRole.BUSINESS_PARTNER, status: UserStatus.INACTIVE },
  });

  // total completed partner requests
  const totalCompletedPartners = await prisma.user.count({
    where: { role: UserRole.BUSINESS_PARTNER, status: UserStatus.ACTIVE },
  });

  return {
    totalUsers,
    totalPartners,
    totalContracts,
    adminEarnings: adminEarnings._sum.admin_commission,
    totalPendingPartners,
    totalCompletedPartners,
  };
};

// get payment with user analysis
const paymentWithUserAnalysis = async () => {
  // total users
  const totalUsers = await prisma.user.count({
    where: { role: UserRole.USER },
  });

  // total partners
  const totalPartners = await prisma.user.count({
    where: { role: UserRole.BUSINESS_PARTNER },
  });

  // payment monthly analysis
  const paymentResult = await prisma.payment.aggregateRaw({
    pipeline: [
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          totalAmount: { $sum: "$amount" },
        },
      },
    ],
  });

  const paymentArray = paymentResult as unknown as {
    _id: { month: number };
    totalAmount: number;
  }[];

  // user monthly analysis
  const userResult = await prisma.user.aggregateRaw({
    pipeline: [
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            role: "$role",
          },
          count: { $sum: 1 },
        },
      },
    ],
  });

  const userArray = userResult as unknown as {
    _id: { month: number; role: string };
    count: number;
  }[];

  // Months
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // structure
  const paymentMonthsData = months.map((name, index) => ({
    month: name,
    totalAmount: 0,
  }));

  const userMonthsData = months.map((name, index) => ({
    month: name,
    userCount: 0,
    partnerCount: 0,
  }));

  //  payments
  for (const r of paymentArray) {
    const monthIndex = r._id.month - 1;
    paymentMonthsData[monthIndex].totalAmount = r.totalAmount;
  }

  // users
  for (const r of userArray) {
    const monthIndex = r._id.month - 1;
    if (r._id.role === UserRole.USER) {
      userMonthsData[monthIndex].userCount = r.count;
    } else if (r._id.role === UserRole.BUSINESS_PARTNER) {
      userMonthsData[monthIndex].partnerCount = r.count;
    }
  }

  return {
    totalUsers,
    totalPartners,
    paymentMonthsData,
    userMonthsData,
  };
};

export const StatisticsService = { getOverview, paymentWithUserAnalysis };
