import { Plan, UserRole, UserStatus } from "@prisma/client";

export type TUser = {
  fullName: string;
  email: string;
  password: string;
  profileImage?: string;
  contactNumber?: string;
  address?: string;
  country?: string;
  role: UserRole;
  status: UserStatus;
  plan?: Plan;
  identifier?: string;
};

export type IUpdateUser = {
  fullName: string;
  contactNumber: string;
  address: string;
  country: string;
};

export type IFilterRequest = {
  searchTerm?: string | undefined;
  fullName?: string | undefined;
  email?: string | undefined;
  contactNumber?: string | undefined;
  country?: string | undefined;
};

export type SafeUser = {
  id: string;
  fullName: string;
  email: string;
  profileImage: string;
  contactNumber: string | null;
  address: string | null;
  country: string | null;
  role: UserRole;
  status: UserStatus;
  plan: Plan;
  createdAt: Date;
  updatedAt: Date;
};

export type IProfileImageResponse = {
  id: string;
  fullName: string;
  email: string;
  profileImage: string | null;
};

