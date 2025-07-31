import prisma from "../../../shared/prisma";

const createHotelBooking = async (data: any) => {
    const result = await prisma.hotel_Booking.create({
        data,
    });
    return result;
};

export const HotelBookingService = {
    createHotelBooking,
};