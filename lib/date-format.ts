type DateValue = string | number | Date;

function parts(value: DateValue) {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return { year: match[1], month: match[2], day: match[3] };
  }

  const date = value instanceof Date ? value : new Date(value);
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    day: String(date.getDate()).padStart(2, "0"),
  };
}

export function formatNumericDate(value: DateValue, shortYear = false) {
  const { year, month, day } = parts(value);
  return `${day}-${month}-${shortYear ? year.slice(-2) : year}`;
}

export function formatNumericDateTime(value: DateValue, shortYear = false) {
  const date = value instanceof Date ? value : new Date(value);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${formatNumericDate(date, shortYear)} ${time}`;
}

export function formatNumericDateRange(start: DateValue, end: DateValue, shortYear = false) {
  return `${formatNumericDate(start, shortYear)} → ${formatNumericDate(end, shortYear)}`;
}
