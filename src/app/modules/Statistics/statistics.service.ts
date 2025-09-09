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
  // get all payments
  const result = await prisma.payment.aggregateRaw({
    pipeline: [
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalAmount: { $sum: "$amount" },
        },
      },
    ],
  });

  // convert to array
  const resultArray = result as unknown as {
    _id: number;
    totalAmount: number;
  }[];

  // get all months
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

  const monthData = new Map(resultArray.map((r) => [r._id, r.totalAmount]));

  // create paymentMonthsData
  const paymentMonthsData = months.map((name, index) => ({
    month: name,
    totalAmount: monthData.get(index + 1) ?? 0,
  }));

  return { paymentMonthsData };
};

export const StatisticsService = { getOverview, paymentWithUserAnalysis };
