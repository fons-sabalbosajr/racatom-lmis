// Utility to automate loan status based on payment mode, last collection, maturity, etc.
// Usage: getAutomatedLoanStatus({ paymentMode, lastCollectionDate, maturityDate, currentDate, thresholds })

// Returns a string status or null (legacy)
export function getAutomatedLoanStatus(params) {
  const { status } = getAutomatedLoanStatusDetailed(params) || {};
  return status || null;
}

// Detailed evaluation with reason based on the specified business rules
export function getAutomatedLoanStatusDetailed({
  paymentMode,
  lastCollectionDate,
  maturityDate,
  currentDate,
  collectionStatus,
  thresholds,
}) {
  const DEFAULTS = {
    dormantDays: 365,
    litigationDaysAfterMaturity: 6 * 30, // approx 6 months
    pastDueDaysAfterMaturity: 7,
    arrearsDailyDays: 3,
    arrearsWeeklyDays: 7,
    arrearsSemiMonthlyDays: 15,
    arrearsMonthlyDays: 30,
  };
  const t = { ...DEFAULTS, ...(thresholds || {}) };

  if (!currentDate) currentDate = new Date();
  if (typeof currentDate === 'string') currentDate = new Date(currentDate);
  if (!lastCollectionDate) lastCollectionDate = null;
  else if (typeof lastCollectionDate === 'string') lastCollectionDate = new Date(lastCollectionDate);
  if (!maturityDate) maturityDate = null;
  else if (typeof maturityDate === 'string') maturityDate = new Date(maturityDate);

  const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

  // Helper: days between two dates (from -> to)
  const daysSince = (from, to) => {
    if (!from || !to) return null;
    return Math.floor((to - from) / (1000 * 60 * 60 * 24));
  };

  // Normalize payment mode
  const pm = (paymentMode || '').toString().trim().toUpperCase();

  // Rule priority: DORMANT > LITIGATION > PAST DUE > ARREARS > UPDATED
  // DORMANT: no collection within configured days
  if (!lastCollectionDate || daysSince(lastCollectionDate, currentDate) >= t.dormantDays) {
    return {
      status: 'DORMANT',
      reason: `No collections within ${t.dormantDays} day${t.dormantDays === 1 ? '' : 's'}`,
    };
  }

  // LITIGATION: no collection 6 months after the maturity date
  if (maturityDate) {
    const litigationAfter = addDays(maturityDate, t.litigationDaysAfterMaturity);
    const lastOnOrBeforeMaturity = lastCollectionDate <= maturityDate;
    if (currentDate > litigationAfter && lastOnOrBeforeMaturity) {
      return {
        status: 'LITIGATION',
        reason: `No collection ${t.litigationDaysAfterMaturity} days after maturity date`,
      };
    }
  }

  // PAST DUE: no collection 7 days after the maturity date
  if (maturityDate) {
    const pastDueAfter = addDays(maturityDate, t.pastDueDaysAfterMaturity);
    const lastOnOrBeforeMaturity = lastCollectionDate <= maturityDate;
    if (currentDate > pastDueAfter && lastOnOrBeforeMaturity) {
      return {
        status: 'PAST DUE',
        reason: `No collection ${t.pastDueDaysAfterMaturity} day${t.pastDueDaysAfterMaturity === 1 ? '' : 's'} after maturity date`,
      };
    }
  }

  // ARREARS: based on payment mode since last collection
  if (lastCollectionDate) {
    const days = daysSince(lastCollectionDate, currentDate) ?? 0;
    if (pm === 'DAILY' && days >= t.arrearsDailyDays) {
      return { status: 'ARREARS', reason: `No collection after ${t.arrearsDailyDays} day${t.arrearsDailyDays === 1 ? '' : 's'} (DAILY)` };
    }
    if (pm === 'WEEKLY' && days >= t.arrearsWeeklyDays) {
      return { status: 'ARREARS', reason: `No collection after ${t.arrearsWeeklyDays} day${t.arrearsWeeklyDays === 1 ? '' : 's'} (WEEKLY)` };
    }
    if ((pm === 'SEMI-MONTHLY' || pm === 'SEMI-MOTHLY') && days >= t.arrearsSemiMonthlyDays) { // handle typo variant
      return { status: 'ARREARS', reason: `No collection after ${t.arrearsSemiMonthlyDays} day${t.arrearsSemiMonthlyDays === 1 ? '' : 's'} (SEMI-MONTHLY)` };
    }
    if (pm === 'MONTHLY' && days >= t.arrearsMonthlyDays) {
      return { status: 'ARREARS', reason: `No collection after ${t.arrearsMonthlyDays} day${t.arrearsMonthlyDays === 1 ? '' : 's'} (MONTHLY)` };
    }
  }

  // UPDATED: if latest collections and data updated (use collectionStatus)
  if ((collectionStatus || '').toString().toLowerCase().includes('updated')) {
    return { status: 'UPDATED', reason: 'Latest collections and data updated' };
  }

  return null;
}
