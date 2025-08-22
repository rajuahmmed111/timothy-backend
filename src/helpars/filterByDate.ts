export const getDateRange = (timeRange?: string) => {
  const now = new Date();

  switch (timeRange) {
    case "THIS_WEEK": {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      return { gte: startOfWeek, lte: now };
    }
    case "THIS_MONTH": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { gte: startOfMonth, lte: now };
    }
    case "THIS_YEAR": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { gte: startOfYear, lte: now };
    }
    default:
      return undefined; // ALL_TIME
  }
};
