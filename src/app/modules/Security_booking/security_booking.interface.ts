export interface ISecurityBookingData {
  name?: string | "";
  email?: string | "";
  phone?: string | "";
  address?: string | "";
  convertedPrice: number;
  displayCurrency: string;
  discountedPrice?: number;
  number_of_security: number;
  securityBookedFromDate: string;
  securityBookedToDate: string;
}
