import prisma from "../../../shared/prisma";

// create hotel
const createHotel = async (payload: any) => {
    const newHotel = await prisma.hotel.create({ data: payload });
    return newHotel;
};

export const HotelService = { createHotel };