export interface IAttractionFilter {
  searchTerm?: string | undefined;
  attractionName?: string | undefined;
  attractionRating?: string | undefined;
  attractionCity?: string | undefined;
  attractionCountry?: string | undefined;
  category?: string | undefined;
  // attractionPriceDay?: number | undefined;
}

export interface ISlot {
  from: string;
  to: string;
}
