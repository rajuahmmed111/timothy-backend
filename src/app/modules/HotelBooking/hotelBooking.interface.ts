export interface IHotelBookingData {
  rooms: number; // number of rooms booked
  adults: number; // number of adults
  children: number; // number of children
  bookedFromDate: string; // date format: "dd-MM-yyyy"
  bookedToDate: string; // date format: "dd-MM-yyyy"
}
