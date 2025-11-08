export interface ICarBookingData {
  name?: string;
  email?: string;
  phone?: string;
  carBookedFromDate: string;
  carBookedToDate: string;
  promo_code?: string;
  convertedPrice: number;
  displayCurrency: string;
  discountedPrice?: number;
}
