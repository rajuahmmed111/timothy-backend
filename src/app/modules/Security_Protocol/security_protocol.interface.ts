import { EveryServiceStatus, Security_Guard, Security_Protocol } from "@prisma/client";

export type ISecurityFilterRequest = {
  searchTerm?: string | undefined;
  securityName?: string | undefined;
  securityCountry?: string | undefined;
  securityRating?: string | undefined;
  category?: string | undefined;
  securityProtocolType?: string | undefined;
  securityGuardName?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  // securityPriceDay?: string | undefined;
};

export interface PopularSecurityProtocol {
  id: string;
  securityBusinessName: string;
  securityName: string;
  securityBusinessType: string;
  securityRegNum: string;
  securityRegDate: string;
  securityPhone: string;
  securityEmail: string;

  securityAddress: string;
  securityCity: string;
  securityPostalCode: string;
  securityDistrict: string;
  securityCountry: string;
  securityDescription: string;
  securityImages: string[]; // 5 images
  securityServicesOffered: string[];
  securityBookingCondition: string;
  securityCancelationPolicy: string;
  securityDocs: string[]; // 5 images

  securityRating: string;
  securityPriceDay: number;

  category?: string | null;
  discount?: number | null;
  isBooked: EveryServiceStatus;
  hiredCount: number;
  vat: number;
  securityReviewCount: number;
  securityBookingAbleDays: string[];

  createdAt: Date;
  updatedAt: Date;

  user: {
    id: string;
    fullName: string | null;
    profileImage: string;
  };
}

export type GroupedProtocols = Record<string, Security_Guard[]>;
