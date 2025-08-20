import { Terms_Condition } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { ICreateTermsCondition } from "./terms.interface";

// Create terms & conditions
const createTerms = async (
  adminId: string,
  payload: ICreateTermsCondition
): Promise<Omit<Terms_Condition, "adminId">> => {
  const result = await prisma.$transaction(async (tx) => {
    // delete previous terms by this admin
    await tx.terms_Condition.deleteMany({
      where: {
        adminId,
      },
    });

    // then create new terms and conditions
    const newTerms = await tx.terms_Condition.create({
      data: {
        ...payload,
        adminId, // stored but not exposed
      },
      select: {
        id: true,
        title: true,
        acceptance_terms: true,
        app_purpose: true,
        user_responsibilities: true,
        data_usage: true,
        intellectual_property: true,
        limitation: true,
        updates: true,
        contactUS: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return newTerms;
  });

  return result;
};

// get terms
const getTermsByAdminId = async (
  adminId: string
): Promise<Omit<Terms_Condition, "adminId"> | null> => {
  const result = await prisma.terms_Condition.findFirst({
    where: { adminId },
    select: {
      id: true,
      title: true,
      acceptance_terms: true,
      app_purpose: true,
      user_responsibilities: true,
      data_usage: true,
      intellectual_property: true,
      limitation: true,
      updates: true,
      contactUS: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Terms and Conditions not found");
  }

  return result;
};

// update terms
const updateTermsByAdminId = async (
  adminId: string,
  payload: Partial<Terms_Condition>
): Promise<Omit<Terms_Condition, "adminId">> => {
  const result = await prisma.terms_Condition.updateMany({
    where: { adminId },
    data: {
      ...payload,
      updatedAt: new Date(),
    },
  });

  // terms and condition updated
  const updatedTerms = await prisma.terms_Condition.findFirst({
    where: { adminId },
    select: {
      id: true,
      title: true,
      acceptance_terms: true,
      app_purpose: true,
      user_responsibilities: true,
      data_usage: true,
      intellectual_property: true,
      limitation: true,
      updates: true,
      contactUS: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedTerms!;
};

export const TermsServices = {
  createTerms,
  getTermsByAdminId,
  updateTermsByAdminId,
};