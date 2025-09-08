import { Prisma } from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import prisma from "../../../shared/prisma";
import { IFilterRequest } from "./finance.interface";
import { searchableFields } from "./finance.constant";

// get all service providers finances
const getAllProvidersFinances = async (
  params: IFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.PaymentWhereInput[] = [];

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  const result = await prisma.payment.findMany({});
  return result;
};

export const FinanceService = {
  getAllProvidersFinances,
};
