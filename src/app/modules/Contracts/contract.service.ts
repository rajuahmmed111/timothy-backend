import e from "express";
import prisma from "../../../shared/prisma";

// get all contracts (bookings)
const getAllContracts = async () => {
  // find all hotel bookings
  const hotel = await prisma.hotel_Booking.findMany();

  // find all security bookings
  const security = await prisma.security_Booking.findMany();

  // find all car bookings
  const car = await prisma.car_Booking.findMany();

  // find all attraction bookings
  const attraction = await prisma.attraction_Booking.findMany();

  return { hotel, security, car, attraction };
};

// get single contract
const getSingleContract = async (id: string) => {};

export const ContractService = {
  getAllContracts,
  getSingleContract,
};
