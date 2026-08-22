const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(date: string): Date {
  if (!DATE_PATTERN.test(date)) throw new Error("Dates must use YYYY-MM-DD");
  const value = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid date: ${date}`);
  }
  return value;
}

export function formatNumericDate(date: string) {
  const value = parseDate(date);
  return `${String(value.getUTCDate()).padStart(2, "0")}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${value.getUTCFullYear()}`;
}

export function formatNumericDateRange(startDate: string, endDate: string) {
  return `${formatNumericDate(startDate)} → ${formatNumericDate(endDate)}`;
}

export function assertDatePeriod(startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (end <= start) throw new Error("Check-out must be after check-in");
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function assertDateRange(startDate: string, endDate: string) {
  const nights = assertDatePeriod(startDate, endDate);
  if (nights > 60) throw new Error("A stay cannot exceed 60 nights");
  return nights;
}

export function enumerateNights(startDate: string, endDate: string) {
  assertDateRange(startDate, endDate);
  const dates: string[] = [];
  for (let current = parseDate(startDate); current < parseDate(endDate); current = new Date(current.getTime() + 86_400_000)) {
    dates.push(current.toISOString().slice(0, 10));
  }
  return dates;
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  assertDatePeriod(startA, endA);
  assertDatePeriod(startB, endB);
  return startA < endB && startB < endA;
}

export function isWeekendNight(date: string) {
  const day = parseDate(date).getUTCDay();
  return day === 5 || day === 6;
}

export function dateInBangkok(timestamp:number){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(timestamp));const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));return `${values.year}-${values.month}-${values.day}`;}
