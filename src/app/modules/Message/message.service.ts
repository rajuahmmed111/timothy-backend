import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { UserRole, UserStatus } from "@prisma/client";
// import channelClients from '../../../server';

// send message
const sendMessage = async (
  senderId: string,
  receiverId: string,
  message: string,
  imageUrls: string[]
) => {
  const [person1, person2] = [senderId, receiverId].sort();
  const channelName = person1 + person2;

  if (!senderId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "UNAUTHORIZED");
  }

  // use transaction
  const [channel, newMessage] = await prisma.$transaction(
    async (prismaTransaction) => {
      let channel = await prismaTransaction.channel.findFirst({
        where: {
          channelName: channelName,
        },
      });

      if (!channel) {
        channel = await prismaTransaction.channel.create({
          data: {
            channelName,
            person1Id: senderId,
            person2Id: receiverId,
          },
        });
      }

      //  message created
      const newMessage = await prismaTransaction.message.create({
        data: {
          message,
          senderId,
          channelName: channelName,
          files: imageUrls,
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      });

      return [channel, newMessage];
    }
  );

  //  all messages channel for the sender and receiver
  const allMessages = await prisma.channel.findMany({
    where: {
      channelName: channelName,
    },
    include: {
      messages: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // // Broadcast the new message to all WebSocket clients subscribed to the channel
  // const connectedClients = channelClients.get(channel.id) || new Set();
  // const messagePayload = {
  //   type: 'newMessage',
  //   channelId: channel.id,
  //   data: newMessage,
  // };

  // connectedClients.forEach((client: any) => {
  //   if (client.readyState === WebSocket.OPEN) {
  //     client.send(JSON.stringify(messagePayload));
  //   }
  // });

  return allMessages;
};

// get my channel by my id
const getMyChannelByMyId = async (userId: string) => {
  // user active + role USER | BUSINESS_PARTNER
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (
    !user ||
    user.status !== UserStatus.ACTIVE ||
    (user.role !== UserRole.USER && user.role !== UserRole.BUSINESS_PARTNER)
  ) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found or invalid role");
  }

  // find channels where person1 or person2
  const channels = await prisma.channel.findMany({
    where: {
      OR: [{ person1Id: userId }, { person2Id: userId }],
    },
    include: {
      person1: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      person2: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  // keep USER or BUSINESS_PARTNER + active
  const result = channels.map((channel) => {
    let receiverUser = null;

    if (channel.person1Id === userId) {
      receiverUser =
        channel.person2 &&
        channel.person2.status === UserStatus.ACTIVE &&
        ([UserRole.USER, UserRole.BUSINESS_PARTNER] as UserRole[]).includes(
          channel.person2.role
        )
          ? channel.person2
          : null;
    } else if (channel.person2Id === userId) {
      receiverUser =
        channel.person1 &&
        channel.person1.status === UserStatus.ACTIVE &&
        ([UserRole.USER, UserRole.BUSINESS_PARTNER] as UserRole[]).includes(
          channel.person1.role
        )
          ? channel.person1
          : null;
    }

    return {
      id: channel.id,
      channelName: channel.channelName,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      receiverUser,
    };
  });

  // only return channels receiverUser
  return result.filter((ch) => ch.receiverUser !== null);
};

// get my channel through my id and receiver id
const getMyChannel = async (userId: string, receiverId: string) => {
  // find person1 and person2
  const user1 = await prisma.user.findUnique({ where: { id: userId } });
  const user2 = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!user1 || !user2) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const [person1, person2] = [userId, receiverId].sort();
  const channelName = person1 + person2;
  const channel = await prisma.channel.findFirst({
    where: {
      channelName: channelName,
    },
  });
  return channel;
};

// get all messages
const getMessagesFromDB = async (channelName: string) => {
  const message = await prisma.channel.findMany({
    where: {
      channelName: channelName,
    },
    select: {
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  return message;
};

// get user channels
const getUserChannels = async (userId: string) => {
  const channels = await prisma.channel.findMany({
    where: {
      OR: [{ person1Id: userId }, { person2Id: userId }],
    },
    include: {
      person1: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
      person2: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });
  return channels;
};

// get single channel
const getSingleChannel = async (channelId: string) => {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      messages: {
        select: {
          id: true,
          senderId: true,
          message: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  if (!channel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Channel not found");
  }

  // const receiverUser 

  return channel;
};

export const messageServices = {
  sendMessage,
  getMyChannel,
  getMyChannelByMyId,
  getMessagesFromDB,
  getUserChannels,
  getSingleChannel,
};
