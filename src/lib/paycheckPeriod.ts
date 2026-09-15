function clampToMonthLength(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

function payDate(year: number, month: number, day: number): Date {
  return new Date(year, month, clampToMonthLength(year, month, day));
}

/**
 * Returns the most recent pay date on/before `today` as a "YYYY-MM-DD" key,
 * given two pay-days-of-month (order doesn't matter). Used to key checklist
 * checks so a new pay period naturally starts unchecked with no reset job.
 */
export function getCurrentPeriodKey(
  payDay1: number,
  payDay2: number,
  today: Date = new Date(),
): string {
  const year = today.getFullYear();
  const month = today.getMonth();

  const candidates = [payDay1, payDay2].flatMap((day) => [
    payDate(year, month - 1, day),
    payDate(year, month, day),
  ]);

  const pastOrToday = candidates.filter((d) => d.getTime() <= today.getTime());
  const mostRecent = pastOrToday.reduce((latest, d) => (d > latest ? d : latest));

  return mostRecent.toISOString().slice(0, 10);
}

/**
 * Returns the current calendar month as a "YYYY-MM" key. Bills recur
 * monthly (unlike the twice-a-month pay-period checklist items), so their
 * "paid" checkbox is keyed by month instead — it naturally starts unchecked
 * again on the 1st of each month with no reset job needed, same trick as
 * getCurrentPeriodKey.
 */
export function getCurrentMonthKey(today: Date = new Date()): string {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}
