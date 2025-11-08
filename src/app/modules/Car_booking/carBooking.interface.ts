export interface ICarBookingData {
  name?: string | "";
  email?: string | "";
  phone?: string | "";
  address?: string | "";
  convertedPrice: number;
  displayCurrency: string;
  discountedPrice?: number;
  carBookedFromDate: string;
  carBookedToDate: string;
  promo_code?: string;
}
