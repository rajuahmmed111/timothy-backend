import { Security_Protocol } from "@prisma/client";

export type ISecurityFilterRequest = {
  searchTerm?: string | undefined;
  securityName?: string | undefined;
  securityCountry?: string | undefined;
  securityRating?: string | undefined;
  category?: string | undefined;
  // securityPriceDay?: string | undefined;
};

export interface PopularSecurityProtocol {
  id: string;
  securityName: string;
  securityRating: string;
  user: {
    id: string;
    fullName: string | null;
    profileImage: string;
  };
}

export type GroupedProtocols = Record<string, Security_Protocol[]>;

