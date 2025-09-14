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
const paymentWithUserAnalysis = async () => {
  // Total users (all-time)
  const totalUsers = await prisma.user.count({
    where: { role: UserRole.USER },
  });

  // Total partners (all-time)
  const totalPartners = await prisma.user.count({
    where: { role: UserRole.BUSINESS_PARTNER },
  });

  // monthly payment aggregation
  const paymentPipeline = [
    {
      $match: { status: "PAID" },
    },
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
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            padding: 20px;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="white" opacity="0.1"/><circle cx="80" cy="80" r="2" fill="white" opacity="0.1"/><circle cx="40" cy="60" r="1" fill="white" opacity="0.1"/><circle cx="70" cy="30" r="1.5" fill="white" opacity="0.1"/></svg>');
        }
        
        .header-content {
            position: relative;
            z-index: 1;
        }
        
        .logo {
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        .header h1 {
            font-size: 26px;
            font-weight: 300;
            margin-bottom: 8px;
        }
        
        .report-date {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #374151;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        
        .partner-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            text-align: center;
        }
        
        .partner-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            margin: 0 auto 20px;
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .partner-name {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }
        
        .partner-email {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 12px;
        }
        
        .partner-id {
            font-size: 12px;
            color: #9ca3af;
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
            font-family: 'Courier New', monospace;
        }
        
        .status-badge {
            display: inline-block;
            margin-top: 15px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            background: #d1fae5;
            color: #065f46;
        }
        
        .earnings-section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            text-align: center;
        }
        
        .earnings-title {
            font-size: 18px;
            color: #374151;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .earnings-amount {
            font-size: 48px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .earnings-period {
            background: #f0fdf4;
            color: #166534;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            display: inline-block;
        }
        
        .details-section {
            background: #f8fafc;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .details-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .details-grid {
            display: grid;
            gap: 8px;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-item:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            color: #6b7280;
            font-size: 14px;
            font-weight: 500;
        }
        
        .detail-value {
            color: #111827;
            font-weight: 600;
            font-size: 14px;
            text-align: right;
        }
        
        .footer {
            background: #1f2937;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .footer-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .footer-text {
            opacity: 0.8;
            margin-bottom: 15px;
        }
        
        .contact-info {
            font-size: 14px;
            opacity: 0.7;
            line-height: 1.4;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            
            .email-container {
                border-radius: 12px;
            }
            
            .header, .content {
                padding: 25px 20px;
            }
            
            .partner-card {
                padding: 25px 20px;
            }
            
            .earnings-amount {
                font-size: 36px;
            }
            
            .details-section, .message-section {
                padding: 20px;
            }
        }
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
        <div class="earnings-amount">$${partner.service_fee.toFixed(0)}</div>
        <div class="earnings-period">📅 Since joining: ${joinDate}</div>
      </div>
      
      <!-- Account Details -->
      <div class="details-section">
        <div class="details-title">📋 Account Information</div>
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Partner Role :</span>
            <span class="detail-value">${partner.role}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Account Status</span>
            <span class="detail-value"> ${partner.status}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Join Date :</span>
            <span class="detail-value"> ${joinDate}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Last Updated :</span>
            <span class="detail-value"> ${updatedDate}</span>
          </div>
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
        <p style="margin-top: 15px; font-size: 12px;">© ${new Date().getFullYear()} YourCompany. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Send the email
  await emailSender("📊 Your Earnings Report", partner.email, html);

  // return partner
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
