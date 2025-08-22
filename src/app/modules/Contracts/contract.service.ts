import e from "express";
import prisma from "../../../shared/prisma";

// get all contracts (bookings)
const getAllContracts = async () => {
    // find all hotel bookings
    const result = await prisma.hotel_Booking.findMany();

    // find all security bookings
    const result2 = await prisma.security_Booking.findMany();

    // find all car bookings
    const result3 = await prisma.car_Booking.findMany();

    // find all attraction bookings
    const result4 = await prisma.attraction_Booking.findMany();

    return { result, result2, result3, result4 };
};

// get single contract
const getSingleContract = async (id: string) => {};

export const ContractService = {
  getAllContracts,
  getSingleContract,
};
