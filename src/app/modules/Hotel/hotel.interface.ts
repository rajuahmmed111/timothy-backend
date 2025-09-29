export type IHotelFilterRequest = {
  searchTerm?: string | undefined;
  hotelName?: string | undefined;
  hotelRoomType?: string | undefined;
  hotelRating?: string | undefined;
  hotelCity?: string | undefined;
  hotelCountry?: string | undefined;
  category?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  hotelBreakfast?: boolean | undefined;
  hotelKitchen?: boolean | undefined;
  hoitelWifi?: boolean | undefined;
  hotelParking?: boolean | undefined;
  
  hotelAC?: boolean | undefined;
  hotelPool?: boolean | undefined;
  hotelSmoking?: boolean | undefined;
  hotelTv?: boolean | undefined;
  hotelWashing?: boolean | undefined;
  hotelNumAdults?: number | undefined;
  hotelNumChildren?: number | undefined;
  hotelNumberOfRooms?: number | undefined;
};
