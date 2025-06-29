import { z } from "zod";
import { Plan, UserRole, UserStatus } from "@prisma/client";

const createUserZodSchema = z.object({
  body: z.object({
    fullName: z.string({ required_error: "Full name is required" }),
    email: z.string({ required_error: "Email is required" }),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters"),
    profileImage: z.string().optional(),
    contactNumber: z.string().optional(),
    address: z.string().optional(),
    country: z.string().optional(),

    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    plan: z.nativeEnum(Plan).optional(),
    identifier: z.string().optional(),
  }),
});

export const updateUserZodSchema = z.object({
  body: z.object({
    fullName: z.string().optional(),
    contactNumber: z.string().optional(),
    address: z.string().optional(),
    country: z.string().optional(),
  }),
});

export const userValidation = {
  createUserZodSchema,
  updateUserZodSchema,
};
