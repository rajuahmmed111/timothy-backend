// import axios from "axios";

// interface UserLocation {
//   country: string;
//   countryCode: string;
//   currency: string;
//   city: string;
//   ip: string;
// }

// export const detectUserLocation = async (
//   ip?: string
// ): Promise<UserLocation> => {
//   try {
//     const url = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";

//     const response = await axios.get(url, { timeout: 3000 });

//     return {
//       country: response.data.country_name || "Bangladesh",
//       countryCode: response.data.country_code || "BD",
//       currency: response.data.currency || "BDT",
//       city: response.data.city || "Dhaka",
//       ip: response.data.ip || "",
//     };
//   } catch (error) {
//     console.error("Location detection failed:", error);

//     return {
//       country: "Bangladesh",
//       countryCode: "BD",
//       currency: "BDT",
//       city: "Dhaka",
//       ip: ip || "",
//     };
//   }
// };

// // user requested currency
// export const getUserCurrency = async (req: any): Promise<string> => {
//   // query parameter
//   if (req.query.currency) {
//     return (req.query.currency as string).toUpperCase();
//   }

//   // header
//   if (req.headers["x-user-currency"]) {
//     return (req.headers["x-user-currency"] as string).toUpperCase();
//   }

//   // user authenticated
//   if (req.user?.preferredCurrency) {
//     return req.user.preferredCurrency.toUpperCase();
//   }

//   // IP detection
//   try {
//     const userIp =
//       req.ip ||
//       req.headers["x-forwarded-for"]?.split(",")[0] ||
//       req.connection.remoteAddress;

//     const location = await detectUserLocation(userIp);
//     return location.currency;
//   } catch (error) {
//     return "USD";
//   }
// };

// // client IP extract
// // export const getClientIP = (req: any): string => {
// //   return (
// //     req.headers["x-forwarded-for"]?.split(",")[0] ||
// //     req.headers["x-real-ip"] ||
// //     req.ip ||
// //     req.connection.remoteAddress ||
// //     req.socket.remoteAddress ||
// //     ""
// //   ).replace("::ffff:", "");
// // };

// // client IP extract
// export const getClientIP = (req: any): string => {
//   let ip =
//     req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
//     req.headers["x-real-ip"] ||
//     req.ip ||
//     req.connection?.remoteAddress ||
//     req.socket?.remoteAddress ||
//     "";

//   // remove IPv6 prefix
//   ip = ip.replace("::ffff:", "").trim();

//   return ip || "Unknown";
// };

import axios from "axios";
import { Request } from "express";

interface UserLocation {
  country: string;
  countryCode: string;
  currency: string;
  city: string;
  ip: string;
}

// IP location detect
const detectUserLocation = async (ip?: string): Promise<UserLocation> => {
  try {
    console.log("🔍 Backend - Attempting to detect location for IP:", ip);
    const url = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";

    const response = await axios.get(url, { timeout: 7000 });
    console.log("✅ Backend - Location detected successfully:", {
      ip: response.data.ip,
      country: response.data.country_name,
      currency: response.data.currency,
      city: response.data.city,
    });

    return {
      country: response.data.country_name || "Bangladesh",
      countryCode: response.data.country_code || "BD",
      currency: response.data.currency || "BDT",
      city: response.data.city || "Dhaka",
      ip: response.data.ip || "",
    };
  } catch (error) {
    console.error("Location detection failed:", error);

    return {
      country: "Bangladesh",
      countryCode: "BD",
      currency: "BDT",
      city: "Dhaka",
      ip: ip || "",
    };
  }
};

// client IP extract (AWS compatible)
const getClientIP = (req: any): string => {
  let ip =
    req.headers["cf-connecting-ip"] || // CloudFront
    req.headers["x-client-ip"] ||
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "";

  ip = ip.replace("::ffff:", "").trim();
  console.log("🌍 Detected IP:", ip);

  return ip || "Unknown";
};

// user currency detect
export const getUserCurrency = async (req: Request): Promise<string> => {
  try {
    const headerCurrency = req.header("x-user-currency") as string;
    if (headerCurrency) {
      // console.log("✔ Using currency from header:", headerCurrency);
      return headerCurrency;
    }

    // receive ip from frontend
    const userIP = req.headers["x-user-ip"] as string;
    if (userIP) {
      // console.log("🌍 Detecting currency using IP:", userIP);

      try {
        // IP → country → currency API
        const geoRes = await axios.get(`https://ipapi.co/${userIP}/json/`);

        if (geoRes.data && geoRes.data.currency) {
          const currency = geoRes.data.currency;
          // console.log("✔ IP Based Currency:", currency);
          return currency;
        }
      } catch (err) {
        console.warn("⚠ IP lookup failed, fallback to timezone / USD");
      }
    }

    // timezone fallback (server timezone)
    try {
      const serverTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const currencyMap: Record<string, string> = {
        "Asia/Dhaka": "BDT",
        "Asia/Kolkata": "INR",
        "Asia/Dubai": "AED",
        "Europe/London": "GBP",
        "Europe/Paris": "EUR",
        "America/New_York": "USD",
      };

      if (currencyMap[serverTZ]) {
        // console.log("🕒 Timezone-based currency:", currencyMap[serverTZ]);
        return currencyMap[serverTZ];
      }
    } catch (err) {
      console.warn("⚠ Timezone currency detection failed");
    }

    return "USD";
  } catch (error) {
    console.error("❌ getUserCurrency error:", error);
    return "USD";
  }
};

export const CurrencyHelpers = {
  detectUserLocation,
  getClientIP,
};
