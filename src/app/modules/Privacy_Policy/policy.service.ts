import prisma from "../../../shared/prisma";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import { IPrivacyPolicy } from "./policy.interface";
import { Privacy_Policy } from "@prisma/client";

// create privacy policy
const createPolicy = async (
  adminId: string,
  payload: IPrivacyPolicy
): Promise<Omit<Privacy_Policy, "adminId"> | null> => {
  const result = await prisma.$transaction(async (tx) => {
    await tx.privacy_Policy.deleteMany({ where: { adminId } });

    const newPolicy = await tx.privacy_Policy.create({
      data: { ...payload, adminId },
      select: {
        id: true,
        title: true,
        introduction: true,
        information_collect: true,
        how_useYour_data: true,
        data_security: true,
        third_party_services: true,
        user_control: true,
        children_privacy: true,
        changes_to_policy: true,
        contact_info: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return newPolicy;
  });

  return result;
};

// get privacy policy           
const getPolicyByAdminId = async (
  adminId: string
): Promise<Omit<Privacy_Policy, "adminId"> | null> => {
  const policy = await prisma.privacy_Policy.findFirst({
    where: { adminId },
    select: {
      id: true,
      title: true,
      introduction: true,
      information_collect: true,
      how_useYour_data: true,
      data_security: true,
      third_party_services: true,
      user_control: true,
      children_privacy: true,
      changes_to_policy: true,
      contact_info: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!policy)
    throw new ApiError(httpStatus.NOT_FOUND, "Privacy Policy not found");
  return policy;
};

// update privacy policy
const updatePolicyByAdminId = async (
  adminId: string,
  payload: Partial<Privacy_Policy>
): Promise<Omit<Privacy_Policy, "adminId">> => {
  await prisma.privacy_Policy.updateMany({
    where: { adminId },
    data: { ...payload, updatedAt: new Date() },
  });

  const updated = await prisma.privacy_Policy.findFirst({
    where: { adminId },
    select: {
      id: true,
      title: true,
      introduction: true,
      information_collect: true,
      how_useYour_data: true,
      data_security: true,
      third_party_services: true,
      user_control: true,
      children_privacy: true,
      changes_to_policy: true,
      contact_info: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated!;
};

export const PrivacyServices = {
  createPolicy,
  getPolicyByAdminId,
  updatePolicyByAdminId,
};
