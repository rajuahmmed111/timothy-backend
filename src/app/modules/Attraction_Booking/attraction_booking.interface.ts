export interface IAttractionBookingData{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    convertedAdultPrice: number;
    convertedChildPrice: number;
    displayCurrency: string;
    discountedPrice?: number;
    adults: number;
    children: number;
    date: string; // "2025-08-12"
    from: string; // "10:00:00"
  }
