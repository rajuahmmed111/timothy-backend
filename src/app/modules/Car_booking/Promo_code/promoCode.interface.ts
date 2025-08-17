import { DiscountType } from "@prisma/client";

export interface ICreatePromoCode {
  code: string;
  discountType?: DiscountType;
  discountValue: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  perUserLimit: number;
  minimumAmount?: number;
}
