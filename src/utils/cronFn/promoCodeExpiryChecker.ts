import cron from "node-cron";
import prisma from "../../shared/prisma";

cron.schedule("0 0 * * *", async () => {
  // run every day at midnight
  const now = new Date().toString();
  await prisma.promoCode.updateMany({
    where: {
      validTo: { lt: now },
      status: "ACTIVE",
    },
    data: { status: "EXPIRED" },
  });
  console.log("Expired promo codes updated");
});
