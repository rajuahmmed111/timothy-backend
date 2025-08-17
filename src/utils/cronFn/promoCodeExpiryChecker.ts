import cron from "node-cron";
import prisma from "../../shared/prisma";
import { PromoStatus } from "@prisma/client";

cron.schedule("0 0 * * *", async () => {
  // run every day at midnight
  const now = new Date().toISOString();
  await prisma.promoCode.updateMany({
    where: {
      validTo: { lt: now },
      status: PromoStatus.ACTIVE,
    },
    data: { status: PromoStatus.EXPIRED },
  });
  console.log("Expired promo codes updated");
});
