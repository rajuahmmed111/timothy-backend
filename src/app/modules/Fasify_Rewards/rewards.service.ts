// import prisma from "../../../shared/prisma";
// import { PromoStatus, RewardSource, RewardTransactionType } from "@prisma/client";

// // program
// const upsertProgram = async (payload: any) => {
//   const existing = await prisma.rewardProgram.findFirst({ where: { active: true } });
//   if (existing) {
//     return prisma.rewardProgram.update({ where: { id: existing.id }, data: payload });
//   }
//   return prisma.rewardProgram.create({ data: payload });
// };

// const getProgram = async () => {
//   return prisma.rewardProgram.findFirst({ where: { active: true } });
// };

// // tiers
// const createTier = async (payload: any) => {
//   return prisma.rewardTier.create({ data: payload });
// };

// const getTiers = async () => {
//   return prisma.rewardTier.findMany({ orderBy: { minPoints: "asc" } });
// };

// const updateTier = async (id: string, payload: any) => {
//   return prisma.rewardTier.update({ where: { id }, data: payload });
// };

// const deleteTier = async (id: string) => {
//   return prisma.rewardTier.delete({ where: { id } });
// };

// // offers
// const createOffer = async (payload: any) => {
//   const { status, ...rest } = payload;
//   return prisma.rewardOffer.create({
//     data: { ...rest, status: (status as PromoStatus) ?? PromoStatus.ACTIVE },
//   });
// };

// const getOffers = async () => {
//   const now = new Date();
//   return prisma.rewardOffer.findMany({
//     where: {
//       validFrom: { lte: now },
//       validTo: { gte: now },
//       status: { not: PromoStatus.EXPIRED },
//     },
//     orderBy: { createdAt: "desc" },
//   });
// };

// const updateOffer = async (id: string, payload: any) => {
//   return prisma.rewardOffer.update({ where: { id }, data: payload });
// };

// const deleteOffer = async (id: string) => {
//   return prisma.rewardOffer.delete({ where: { id } });
// };

// // helpers
// const getUserTier = async (points: number) => {
//   const tiers = await prisma.rewardTier.findMany({ where: { active: true } });
//   const sorted = tiers.sort((a, b) => b.minPoints - a.minPoints);
//   return sorted.find(t => points >= t.minPoints) ?? null;
// };

// // balances
// const getUserBalance = async (userId: string) => {
//   return prisma.rewardPointBalance.upsert({
//     where: { userId },
//     update: {},
//     create: { userId, points: 0, lifetimePoints: 0 },
//   });
// };

// const getUserTransactions = async (userId: string) => {
//   return prisma.rewardTransaction.findMany({
//     where: { userId },
//     orderBy: { createdAt: "desc" },
//   });
// };

// // core operations
// type AwardArgs = {
//   userId: string;
//   amount: number; // in display currency units
//   source: RewardSource;
//   referenceId?: string;
// };

// const awardPoints = async ({ userId, amount, source, referenceId }: AwardArgs) => {
//   const program = await getProgram();
//   const earnRate = program?.earnRate ?? 1.0;

//   const balance = await getUserBalance(userId);
//   const tier = await getUserTier(balance.points);
//   const multiplier = tier?.multiplier ?? 1.0;

//   const points = Math.floor(amount * earnRate * multiplier);
//   if (points <= 0) return balance;

//   await prisma.$transaction(async tx => {
//     await tx.rewardTransaction.create({
//       data: {
//         userId,
//         type: RewardTransactionType.EARN,
//         source,
//         points,
//         referenceId,
//       },
//     });

//     await tx.rewardPointBalance.update({
//       where: { userId },
//       data: { points: { increment: points }, lifetimePoints: { increment: points } },
//     });
//   });

//   return getUserBalance(userId);
// };

// const adjustPoints = async (userId: string, points: number, metadata?: any) => {
//   await getUserBalance(userId);
//   await prisma.$transaction(async tx => {
//     await tx.rewardTransaction.create({
//       data: {
//         userId,
//         type: RewardTransactionType.ADJUST,
//         source: RewardSource.ADMIN,
//         points,
//         metadata,
//       },
//     });
//     await tx.rewardPointBalance.update({
//       where: { userId },
//       data: { points: { increment: points } },
//     });
//   });
//   return getUserBalance(userId);
// };

// const redeemPoints = async (userId: string, points: number, referenceId?: string) => {
//   const balance = await getUserBalance(userId);
//   if (balance.points < points) throw new Error("Insufficient points");

//   await prisma.$transaction(async tx => {
//     await tx.rewardTransaction.create({
//       data: {
//         userId,
//         type: RewardTransactionType.REDEEM,
//         source: RewardSource.ADMIN,
//         points: -Math.abs(points),
//         referenceId,
//       },
//     });
//     await tx.rewardPointBalance.update({
//       where: { userId },
//       data: { points: { decrement: Math.abs(points) } },
//     });
//   });
//   return getUserBalance(userId);
// };

// export const RewardsService = {
//   upsertProgram,
//   getProgram,
//   createTier,
//   getTiers,
//   updateTier,
//   deleteTier,
//   createOffer,
//   getOffers,
//   updateOffer,
//   deleteOffer,
//   getUserBalance,
//   getUserTransactions,
//   awardPoints,
//   adjustPoints,
//   redeemPoints,
// };

