/** Returns today's date as a YYYY-MM-DD string in local time. */
export function todayString(): string {
  const d = new Date();
  return toDateString(d);
}

/** Converts a Date object to a YYYY-MM-DD local-time string. */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a YYYY-MM-DD string into its numeric parts. */
export function parseDateString(date: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

/** Number of days in the given month (month is 1-based). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Returns the 0-based weekday (0 = Sunday) that the 1st of the month falls on.
 * Used to offset the calendar grid.
 */
export function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

/** Full month name for display. */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Short weekday headers for the calendar grid. */
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
