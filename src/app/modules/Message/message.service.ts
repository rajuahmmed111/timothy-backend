import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
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

export const messageServices = {
  sendMessage,
  getMyChannel,
  getMessagesFromDB,
  getUserChannels,
};
