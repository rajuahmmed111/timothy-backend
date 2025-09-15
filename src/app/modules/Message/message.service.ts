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
  imageUrls: string[],
  messageType?: "Critical" | "High" | "Medium" | "Low"
) => {
  // receiver role check
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { role: true },
  });

  if (!receiver) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid receiver");
  }

  // if receiver is ADMIN => messageType required
  if (receiver.role === UserRole.ADMIN && !messageType) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "messageType is required when sending message to ADMIN"
    );
  }

  // if receiver is not ADMIN => messageType must not be set
  if (receiver.role !== UserRole.ADMIN && messageType) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "messageType can only be set when sending message to ADMIN"
    );
  }

  const [person1, person2] = [senderId, receiverId].sort();
  const channelName = person1 + person2;

  const [channel, newMessage] = await prisma.$transaction(
    async (prismaTransaction) => {
      let channel = await prismaTransaction.channel.findFirst({
        where: { channelName },
      });

      if (!channel) {
        channel = await prismaTransaction.channel.create({
          data: { channelName, person1Id: senderId, person2Id: receiverId },
        });
      }

      const newMessage = await prismaTransaction.message.create({
        data: {
          message,
          senderId,
          channelName,
          files: imageUrls,
          messageType: receiver.role === UserRole.ADMIN ? messageType : null,
        },
        include: {
          sender: {
            select: { id: true, fullName: true, profileImage: true },
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

// get all channels only user and admin
const getUserAdminChannels = async () => {
  // find all channels
  const channels = await prisma.channel.findMany({
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

  // filter: keep only channels where both persons are active & role in ADMIN | USER
  const result = channels.map((channel) => {
    let receiverUser = null;

    // person1 is valid receiver?
    if (
      channel.person1 &&
      channel.person1.status === UserStatus.ACTIVE &&
      (channel.person1.role === UserRole.USER ||
        channel.person1.role === UserRole.ADMIN)
    ) {
      receiverUser = channel.person1;
    }

    // person2 is valid receiver?
    if (
      channel.person2 &&
      channel.person2.status === UserStatus.ACTIVE &&
      (channel.person2.role === UserRole.USER ||
        channel.person2.role === UserRole.ADMIN)
    ) {
      // decide receiverUser based on some logic, e.g., prefer person2
      // or you can keep both in array if you want
      receiverUser = receiverUser
        ? [receiverUser, channel.person2]
        : channel.person2;
    }

    return {
      id: channel.id,
      channelName: channel.channelName,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      receiverUser,
    };
  });

  // only return channels where valid receiver exists
  return result.filter((ch) => ch.receiverUser !== null);
};

// get single channel
const getSingleChannel = async (channelId: string) => {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
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

  // receiver user
  let receiverUser = null;

  if (channel.messages.length > 0) {
    const firstMessageSenderId = channel.messages[0].senderId;

    if (firstMessageSenderId === channel.person1Id) {
      receiverUser = channel.person2;
    } else if (firstMessageSenderId === channel.person2Id) {
      receiverUser = channel.person1;
    }
  } else {
    // no messages
    receiverUser = channel.person2;
  }

  return {
    id: channel.id,
    channelName: channel.channelName,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
    receiverUser,
    messages: channel.messages,
  };
};

export const messageServices = {
  sendMessage,
  getMyChannel,
  getMyChannelByMyId,
  getMessagesFromDB,
  getUserChannels,
  getUserAdminChannels,
  getSingleChannel,
};
