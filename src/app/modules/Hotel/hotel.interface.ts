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
};
