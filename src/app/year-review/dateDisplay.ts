const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }));

export function formatYearReviewDate(item: {
  year: number;
  month: number | null;
  date: string | null;
}) {
  if (item.date) {
    const d = new Date(`${item.date}T00:00:00Z`);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  if (item.month) {
    return `${MONTH_NAMES[item.month - 1]} ${item.year}`;
  }
  return String(item.year);
}
