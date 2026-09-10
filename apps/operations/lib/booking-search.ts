import Fuse from "fuse.js";

type SearchableBooking = { guestName: string; guestPhone: string; guestLineId?: string; creatorName: string; checkIn: string; checkOut: string; totalChargedThb: number };

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().trim();
}

function compact(value: string) {
  return normalize(value).replace(/[\p{P}\p{Z}\s]/gu, "").replace(/[๐-๙]/g, (digit) => String(digit.charCodeAt(0) - 0x0e50));
}

const monthFormats = [
  new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }),
  new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }),
  new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "UTC" }),
  new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: "UTC" }),
];
const monthNames = new Set(Array.from({ length: 12 }, (_, month) => monthFormats.map((formatter) => compact(formatter.format(new Date(Date.UTC(2026, month, 1)))))).flat());

function indexBookingSearch(booking: SearchableBooking) {
  const fields = [booking.guestName, booking.creatorName, booking.guestLineId ?? "", booking.guestPhone];
  const total = String(booking.totalChargedThb);
  fields.push(total, `${total}฿`, `฿${total}`, `${total} THB`, `${total} บาท`);
  // Index aliases once per data update, not once per keystroke.
  const date = new Date(`${booking.checkIn}T00:00:00.000Z`);
  for (let i = 0; i <= 90 && Number.isFinite(date.getTime()); i++, date.setUTCDate(date.getUTCDate() + 1)) {
    const key = date.toISOString().slice(0, 10);
    if (key > booking.checkOut) break;
    const [year, month, day] = key.split("-");
    const thaiYear = String(Number(year) + 543);
    fields.push(key, `${day}/${month}`, `${Number(day)}/${Number(month)}`);
    for (const y of [year, year.slice(2), thaiYear, thaiYear.slice(2)]) {
      fields.push(`${day}/${month}/${y}`, `${Number(day)}/${Number(month)}/${y}`);
      for (const formatter of monthFormats) {
        const name = formatter.format(date);
        fields.push(`${Number(day)} ${name} ${y}`, `${name} ${Number(day)} ${y}`);
      }
    }
  }
  return { from: booking.checkIn, to: booking.checkOut, fields: [...new Set(fields.map(normalize))].map((field) => ({
    text: field,
    compact: compact(field),
    words: field.split(/[\s@._/-]+/).map(compact),
  })) };
}

export function createBookingSearch<T extends SearchableBooking>(bookings: T[]) {
  const documents = bookings.map((booking) => ({ booking, ...indexBookingSearch(booking) }));
  const options = { keys: ["fields.compact"], ignoreLocation: true, ignoreFieldNorm: true, shouldSort: false, minMatchCharLength: 1 };
  const fuzzy = new Fuse(documents, { ...options, threshold: 0.3 });
  const exact = new Fuse(documents, { ...options, threshold: 0 });

  return (search: string): T[] => {
    const query = normalize(search);
    if (!query) return bookings;
    const yearRange = query.match(/^(\d{4})\s*[-–—]\s*(\d{4})$/);
    if (yearRange) {
      const fromYear = Number(yearRange[1]), toYear = Number(yearRange[2]);
      return documents.filter((item) => fromYear <= toYear && item.from <= `${toYear}-12-31` && item.to >= `${fromYear}-01-01`).map((item) => item.booking);
    }
    const datePhrase = compact(query).match(/^(\d{1,2})([^\d]+)(\d{2}|\d{4})?$/);
    const isDate = Boolean(datePhrase && monthNames.has(datePhrase[2]));
    const wholeQuery = isDate && datePhrase ? `${Number(datePhrase[1])}${datePhrase[2]}${datePhrase[3] ?? ""}` : compact(query);
    const engine = /\d/.test(wholeQuery) ? exact : fuzzy;
    const matched = new Set(engine.search(wholeQuery).map((result) => result.refIndex));
    // Combine separate terms across fields, but keep a recognised date together.
    if (!isDate && query.includes(" ")) {
      const tokens = query.split(/\s+/).map(compact).filter(Boolean);
      let intersection: Set<number> | undefined;
      for (const token of tokens) {
        const hits = new Set((/\d/.test(token) ? exact : fuzzy).search(token).map((result) => result.refIndex));
        intersection = intersection ? new Set([...intersection].filter((id) => hits.has(id))) : hits;
      }
      for (const id of intersection ?? []) matched.add(id);
    }
    // Preserve the requested newest-created-first order, including across pages.
    return documents.filter((_, index) => matched.has(index)).map((item) => item.booking);
  };
}
