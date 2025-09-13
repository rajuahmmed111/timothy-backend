import e from "express";
import prisma from "../../../shared/prisma";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { IContractFilterRequest } from "./contract.interface";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { searchableFields } from "./contract.constant";
import ApiError from "../../../errors/ApiErrors";

// get all contracts (bookings)
const getAllContracts = async (
  params: IContractFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);
  const { searchTerm, timeRange, bookingStatus, ...filterData } = params;

  // fetch all bookings
  const hotel = await prisma.hotel_Booking.findMany();
  const security = await prisma.security_Booking.findMany();
  const car = await prisma.car_Booking.findMany();
  const attraction = await prisma.attraction_Booking.findMany();
  

  // merge all into one array and add type
  let allContracts = [
    ...hotel.map((item) => ({ type: "hotel", ...item })),
    ...security.map((item) => ({ type: "security", ...item })),
    ...car.map((item) => ({ type: "car", ...item })),
    ...attraction.map((item) => ({ type: "attraction", ...item })),
  ];

  // search
  if (searchTerm) {
    allContracts = allContracts.filter((contract) =>
      searchableFields.some((field) => {
        const value = (contract as any)[field];
        return (
          value &&
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    );
  }

  // exact filter bookingStatus
  if (bookingStatus) {
    allContracts = allContracts.filter(
      (contract) => contract.bookingStatus === bookingStatus
    );
  }

  // pagination
  const total = allContracts.length;
  const paginatedContracts = allContracts.slice(skip, skip + limit);

  // sorting
  if (options.sortBy && options.sortOrder) {
    const sortField = options.sortBy as keyof (typeof allContracts)[0];
    paginatedContracts.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // null/undefined check
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return options.sortOrder === "asc" ? -1 : 1;
      if (bValue == null) return options.sortOrder === "asc" ? 1 : -1;

      if (options.sortOrder === "asc") return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
  } else {
    paginatedContracts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: paginatedContracts,
  };
};

// get single contract by id
const getSingleContract = async (id: string, type: string) => {
  let contract;

  switch (type) {
    case "hotel":
      contract = await prisma.hotel_Booking.findUnique({ where: { id } });
      break;
    case "security":
      contract = await prisma.security_Booking.findUnique({ where: { id } });
      break;
    case "car":
      contract = await prisma.car_Booking.findUnique({ where: { id } });
      break;
    case "attraction":
      contract = await prisma.attraction_Booking.findUnique({ where: { id } });
      break;
    default:
      throw new Error("Invalid contract type");
  }

  if (!contract) {
    throw new Error("Contract not found");
  }

  return { type, ...contract };
};

export const ContractService = {
  getAllContracts,
  getSingleContract,
};
