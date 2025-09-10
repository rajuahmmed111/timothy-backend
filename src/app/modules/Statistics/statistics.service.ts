import {
  BookingStatus,
  PaymentStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import prisma from "../../../shared/prisma";
import { IFilterRequest } from "./statistics.interface";
import { getYearRange } from "../../../helpars/filterByDate";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import emailSender from "../../../helpars/emailSender";
import { format } from "date-fns";

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

  // admin earnings (only PAID payments)
  const adminEarnings = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.PAID,
    },
    _sum: {
      admin_commission: true,
    },
  });
  if (!adminEarnings) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin earnings not found");
  }
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
const paymentWithUserAnalysis = async (params: IFilterRequest) => {
  const { yearRange } = params;

  // Get date range for filtering
  const dateRange = getYearRange(yearRange);

  // Total users with date filtering
  const totalUsers = await prisma.user.count({
    where: {
      role: UserRole.USER,
      ...(dateRange && { createdAt: dateRange }),
    },
  });

  // Total partners with date filtering
  const totalPartners = await prisma.user.count({
    where: {
      role: UserRole.BUSINESS_PARTNER,
      ...(dateRange && { createdAt: dateRange }),
    },
  });

  // Monthly payment aggregation - ONLY include PAID payments
  const paymentPipeline = [
    // Filter by date range if provided
    ...(dateRange
      ? [
          {
            $match: {
              createdAt: { $gte: dateRange.gte, $lte: dateRange.lte },
              status: "PAID", // Only include paid payments
            },
          },
        ]
      : [{ $match: { status: "PAID" } }]), // Always filter for paid payments
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
      },
    },
  ];

  const paymentResult = await prisma.payment.aggregateRaw({
    pipeline: paymentPipeline,
  });

  const paymentArray = paymentResult as unknown as {
    _id: { month: number };
    totalAmount: number;
  }[];

  // Monthly user aggregation
  const userPipeline = [
    // Filter by date range if provided
    ...(dateRange
      ? [
          {
            $match: {
              createdAt: { $gte: dateRange.gte, $lte: dateRange.lte },
            },
          },
        ]
      : []),
    {
      $group: {
        _id: { month: { $month: "$createdAt" }, role: "$role" },
        count: { $sum: 1 },
      },
    },
  ];

  const userResult = await prisma.user.aggregateRaw({
    pipeline: userPipeline,
  });

  const userArray = userResult as unknown as {
    _id: { month: number; role: string };
    count: number;
  }[];

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

  // Initialize payment & user data arrays
  const paymentMonthsData = months.map((name) => ({
    month: name,
    totalAmount: 0,
  }));
  const userMonthsData = months.map((name) => ({
    month: name,
    userCount: 0,
    partnerCount: 0,
  }));

  // Fill payment data
  for (const r of paymentArray) {
    const monthIndex = r._id.month - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      paymentMonthsData[monthIndex].totalAmount = r.totalAmount;
    }
  }

  // Fill user data
  for (const r of userArray) {
    const monthIndex = r._id.month - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      if (r._id.role === UserRole.USER) {
        userMonthsData[monthIndex].userCount = r.count;
      } else if (r._id.role === UserRole.BUSINESS_PARTNER) {
        userMonthsData[monthIndex].partnerCount = r.count;
      }
    }
  }

  return {
    totalUsers,
    totalPartners,
    paymentMonthsData,
    userMonthsData,
  };
};

// financial metrics
const financialMetrics = async () => {
  // total admin and service earnings (only PAID payments)
  const earnings = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.PAID,
    },
    _sum: {
      admin_commission: true,
      service_fee: true,
    },
  });

  if (!earnings) {
    throw new ApiError(httpStatus.NOT_FOUND, "Earnings not found");
  }

  // monthly earnings (group by month)
  const monthlyPayments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PAID,
    },
    select: {
      createdAt: true,
      admin_commission: true,
      service_fee: true,
    },
  });

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

  const paymentMonthsData = months.map((name, index) => {
    // sum earnings for this month (regardless of year)
    const monthlyData = monthlyPayments.filter(
      (p) => p.createdAt.getUTCMonth() === index
    );

    const adminEarnings = monthlyData.reduce(
      (sum, p) => sum + (p.admin_commission ?? 0),
      0
    );

    const serviceEarnings = monthlyData.reduce(
      (sum, p) => sum + (p.service_fee ?? 0),
      0
    );

    return {
      month: name,
      adminEarnings,
      serviceEarnings,
    };
  });

  return {
    adminEarnings: earnings._sum.admin_commission ?? 0,
    serviceEarnings: earnings._sum.service_fee ?? 0,
    paymentMonthsData,
  };
};

// booking and cancel/refund metrics
const cancelRefundAndContracts = async () => {
  // total canceled/refunded count
  const canceledCount = await prisma.payment.count({
    where: {
      status: PaymentStatus.REFUNDED,
    },
  });

  // total refund amount
  const refundAmount = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.REFUNDED,
    },
    _sum: {
      amount: true,
    },
  });

  // total payments
  const totalPayments = await prisma.payment.count();

  // cancel rate as percentage
  const cancelRate =
    totalPayments > 0 ? (canceledCount / totalPayments) * 100 : 0;

  // total booking counts by type
  const [hotelCount, securityCount, carCount, attractionCount] =
    await Promise.all([
      prisma.hotel_Booking.count(),
      prisma.security_Booking.count(),
      prisma.car_Booking.count(),
      prisma.attraction_Booking.count(),
    ]);

  const totalContracts =
    hotelCount + securityCount + carCount + attractionCount;

  // total bookings by status
  const [
    pendingHotel,
    confirmedHotel,
    pendingSecurity,
    confirmedSecurity,
    pendingCar,
    confirmedCar,
    pendingAttraction,
    confirmedAttraction,
  ] = await Promise.all([
    prisma.hotel_Booking.count({
      where: { bookingStatus: BookingStatus.CONFIRMED },
    }),
    prisma.hotel_Booking.count({
      where: { bookingStatus: BookingStatus.PENDING },
    }),
    prisma.security_Booking.count({
      where: { bookingStatus: BookingStatus.CONFIRMED },
    }),
    prisma.security_Booking.count({
      where: { bookingStatus: BookingStatus.PENDING },
    }),
    prisma.car_Booking.count({
      where: { bookingStatus: BookingStatus.CONFIRMED },
    }),
    prisma.car_Booking.count({
      where: { bookingStatus: BookingStatus.PENDING },
    }),
    prisma.attraction_Booking.count({
      where: { bookingStatus: BookingStatus.CONFIRMED },
    }),
    prisma.attraction_Booking.count({
      where: { bookingStatus: BookingStatus.PENDING },
    }),
  ]);

  const totalPending =
    pendingHotel + pendingSecurity + pendingCar + pendingAttraction;

  const totalConfirmed =
    confirmedHotel + confirmedSecurity + confirmedCar + confirmedAttraction;

  const pendingRate =
    totalContracts > 0 ? (totalPending / totalContracts) * 100 : 0;

  const confirmedRate =
    totalContracts > 0 ? (totalConfirmed / totalContracts) * 100 : 0;

  return {
    canceledCount,
    refundAmount: refundAmount._sum.amount ?? 0,
    cancelRate,
    totalContracts,
    totalPending,
    totalConfirmed,
    pendingRate,
    confirmedRate,
  };
};

// get all service provider for send report
const getAllServiceProviders = async () => {
  const partners = await prisma.user.findMany({
    where: {
      role: UserRole.BUSINESS_PARTNER,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      fullName: true,
      contactNumber: true,
      profileImage: true,
      email: true,
      role: true,
      status: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!partners || partners.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No partner found");
  }

  // add service_fee sum for each partner
  const partnerEarnings = await Promise.all(
    partners.map(async (partner) => {
      const earnings = await prisma.payment.aggregate({
        where: {
          partnerId: partner.id,
          status: PaymentStatus.PAID,
        },
        _sum: {
          service_fee: true,
        },
      });
      return {
        ...partner,
        service_fee: earnings._sum.service_fee ?? 0,
      };
    })
  );

  return { partnerEarnings };
};

// get single service provider
const getSingleServiceProvider = async (id: string) => {
  const partner = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      contactNumber: true,
      profileImage: true,
      email: true,
      role: true,
      status: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // calculate earnings
  const earnings = await prisma.payment.aggregate({
    where: {
      partnerId: id,
      status: PaymentStatus.PAID,
    },
    _sum: {
      service_fee: true,
    },
  });

  return {
    ...partner,
    service_fee: earnings._sum.service_fee ?? 0,
  };
};

// send report to service provider through email
const sendReportToServiceProviderThroughEmail = async (id: string) => {
  // fetch single service provider
  const partner = await getSingleServiceProvider(id);

  if (!partner.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Partner email not found");
  }

  // Format dates nicely
  const joinDate = format(new Date(partner.createdAt), "MMMM d, yyyy");
  const updatedDate = format(new Date(partner.updatedAt), "MMMM d, yyyy");
  const reportDate = format(new Date(), "MMMM yyyy");

  // Prepare email HTML (dynamic)
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Earnings Report</title>
  <style>
    /* [keep all your CSS styles exactly as in your template] */
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo">💰</div>
        <h1>Your Earnings Report</h1>
        <div class="report-date">${reportDate}</div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="content">
      <div class="greeting">
        Dear <strong>${partner.fullName ?? "Valued Partner"}</strong>,<br><br>
        We hope this message finds you well! We're excited to share your latest earnings report as our valued business partner.
      </div>
      
      <!-- Partner Info Card -->
      <div class="partner-card">
        <img src="${partner.profileImage}" alt="Profile" class="partner-avatar">
        <div class="partner-name">${partner.fullName ?? "Unknown"}</div>
        <div class="partner-email">${partner.email}</div>
        <div class="partner-id">ID: ${partner.id}</div>
        <div class="status-badge">✅ ${partner.status} Partner</div>
      </div>
      
      <!-- Earnings Display -->
      <div class="earnings-section">
        <div class="earnings-title">🎉 Your Total Service Fee Earnings</div>
        <div class="earnings-amount">৳${partner.service_fee.toFixed(0)}</div>
        <div class="earnings-currency">Bangladeshi Taka</div>
        <div class="earnings-period">📅 Since joining: ${joinDate}</div>
      </div>
      
      <!-- Account Details -->
      <div class="details-section">
        <div class="details-title">📋 Account Information</div>
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Partner Role</span>
            <span class="detail-value">${partner.role}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Account Status</span>
            <span class="detail-value">${partner.status}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Join Date</span>
            <span class="detail-value">${joinDate}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Last Updated</span>
            <span class="detail-value">${updatedDate}</span>
          </div>
        </div>
      </div>
      
      <!-- Message Section -->
      <div class="message-section">
        <div class="message-icon">🚀</div>
        <div class="message-title">Keep up the great work!</div>
        <div class="message-text">
          Your earnings reflect your dedication and hard work as our business partner. We truly appreciate your contribution to our growing success. Keep up the excellent work and let's achieve even greater milestones together!
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-title">Thank You for Being Our Partner! 🤝</div>
      <p class="footer-text">Your success is our success. Let's continue building something amazing together.</p>
      <div class="contact-info">
        <p>Questions? Contact us at support@yourcompany.com</p>
        <p>📞 +880-XXXX-XXXX | 🌐 www.yourcompany.com</p>
        <p style="margin-top: 15px; font-size: 12px;">© 2025 YourCompany. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Send the email
  await emailSender("📊 Your Earnings Report", partner.email, html);
};

export const StatisticsService = {
  getOverview,
  paymentWithUserAnalysis,
  financialMetrics,
  cancelRefundAndContracts,
  getAllServiceProviders,
  getSingleServiceProvider,
  sendReportToServiceProviderThroughEmail,
};
