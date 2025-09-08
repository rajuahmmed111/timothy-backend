import { Prisma } from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import prisma from "../../../shared/prisma";
import { IFilterRequest } from "./finance.interface";

// get all service providers finances
const getAllProvidersFinances = async (
  params: IFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.PaymentWhereInput[] = [];

  const result = await prisma.payment.findMany({});
  return result;
};

export const FinanceService = {
  getAllProvidersFinances,
};
