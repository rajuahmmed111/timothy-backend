import prisma from "../../../shared/prisma";

// create news room
const createNewsRoom = async (payload: any) => {
  const newsRoom = await prisma.newsroom.create({ data: payload });
  return newsRoom;
};

export const NewsRoomService = { createNewsRoom };