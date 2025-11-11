// import { z } from "zod";

// // program
// const createProgramZodSchema = z.object({
//   body: z.object({
//     name: z.string().min(1).optional(),
//     description: z.string().optional(),
//     earnRate: z.number().positive().optional(),
//     redeemRate: z.number().positive().optional(),
//     active: z.boolean().optional(),
//   }),
// });

// const updateProgramZodSchema = z.object({
//   body: z.object({
//     name: z.string().optional(),
//     description: z.string().optional(),
//     earnRate: z.number().positive().optional(),
//     redeemRate: z.number().positive().optional(),
//     active: z.boolean().optional(),
//   }),
// });

// // tiers
// const createTierZodSchema = z.object({
//   body: z.object({
//     name: z.string().min(1),
//     minPoints: z.number().int().nonnegative().default(0),
//     multiplier: z.number().positive().default(1),
//     benefits: z.array(z.string()).default([]),
//     active: z.boolean().optional(),
//   }),
// });

// const updateTierZodSchema = z.object({
//   body: z.object({
//     name: z.string().optional(),
//     minPoints: z.number().int().nonnegative().optional(),
//     multiplier: z.number().positive().optional(),
//     benefits: z.array(z.string()).optional(),
//     active: z.boolean().optional(),
//   }),
// });

// // offers
// const createOfferZodSchema = z.object({
//   body: z.object({
//     title: z.string().min(1),
//     description: z.string().optional(),
//     pointsBonus: z.number().int().nonnegative().optional(),
//     discountPercent: z.number().positive().max(100).optional(),
//     validFrom: z.string().datetime(),
//     validTo: z.string().datetime(),
//     status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
//     eligibleTierIds: z.array(z.string()).default([]),
//     usageLimit: z.number().int().positive().optional(),
//   }),
// });

// const updateOfferZodSchema = z.object({
//   body: z.object({
//     title: z.string().optional(),
//     description: z.string().optional(),
//     pointsBonus: z.number().int().nonnegative().optional(),
//     discountPercent: z.number().positive().max(100).optional(),
//     validFrom: z.string().datetime().optional(),
//     validTo: z.string().datetime().optional(),
//     status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
//     eligibleTierIds: z.array(z.string()).optional(),
//     usageLimit: z.number().int().positive().optional(),
//   }),
// });

// // member actions
// const adjustPointsZodSchema = z.object({
//   body: z.object({
//     points: z.number().int(),
//     reason: z.string().optional(),
//   }),
// });

// const redeemPointsZodSchema = z.object({
//   body: z.object({
//     points: z.number().int().positive(),
//     referenceId: z.string().optional(),
//   }),
// });

// export const RewardsValidation = {
//   createProgramZodSchema,
//   updateProgramZodSchema,
//   createTierZodSchema,
//   updateTierZodSchema,
//   createOfferZodSchema,
//   updateOfferZodSchema,
//   adjustPointsZodSchema,
//   redeemPointsZodSchema,
// };

