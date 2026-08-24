"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Phone,
  Send,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatNumericDate } from "@/lib/date-format";
import { ConvexPublicProvider } from "@/components/ConvexPublicProvider";

type Rate = {
  labelEn: string;
  labelTh: string;
  startDate: string;
  endDate: string;
  recurringDay?: "sunday";
  nightlyPriceThb: number;
  sortOrder: number;
};
type Block = { startDate: string; endDate: string };
type CalendarProps = {
  villaId: Id<"villas">;
  locale: "en" | "th";
  weekdayPriceThb: number;
  weekendPriceThb?: number;
  rates: Rate[];
  unavailable: Block[];
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  embedded?: boolean;
};

const iso = (date: Date) => date.toISOString().slice(0, 10);
const atUtc = (value: string) => new Date(`${value}T00:00:00.000Z`);
const money = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
const shortPrice = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k`
    : String(value);
const overlaps = (startA: string, endA: string, startB: string, endB: string) =>
  startA < endB && startB < endA;

export function isValidPhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!/^\+?[0-9 ()-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function bookingSubmitErrorMessage(
  error: unknown,
  locale: "en" | "th",
) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("RateLimit") || message.includes("rate limit"))
    return locale === "th"
      ? "ส่งคำขอหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"
      : "Too many booking requests. Please wait a moment and try again.";
  if (message.includes("no longer available"))
    return locale === "th"
      ? "วันที่ดังกล่าวไม่ว่างแล้ว กรุณาเลือกใหม่"
      : "Those dates are no longer available. Choose another stay.";
  return locale === "th"
    ? "ส่งคำขอไม่สำเร็จ โปรดตรวจสอบข้อมูลแล้วลองอีกครั้ง"
    : "Could not send your request. Check your details and try again.";
}

export function VillaBookingCalendar(props: CalendarProps) {
  return (
    <ConvexPublicProvider>
      <VillaBookingCalendarContent {...props} />
    </ConvexPublicProvider>
  );
}

function VillaBookingCalendarContent(props: CalendarProps) {
  const now = new Date();
  const today = iso(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
  const initial =
    props.initialCheckIn && props.initialCheckIn >= today
      ? atUtc(props.initialCheckIn)
      : atUtc(today);
  const [month, setMonth] = useState(
    () =>
      new Date(Date.UTC(initial.getUTCFullYear(), initial.getUTCMonth(), 1)),
  );
  const [checkIn, setCheckIn] = useState(props.initialCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(props.initialCheckOut ?? "");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const submissionKey = useRef(crypto.randomUUID());
  const submitRequest = useMutation(api.bookingRequests.submit);
  const quote = useQuery(
    api.villas.quote,
    checkIn && checkOut
      ? { villaId: props.villaId, checkIn, checkOut }
      : "skip",
  );
  const th = props.locale === "th";
  const copy = th
    ? {
        title: "เลือกวันที่เข้าพัก",
        lead: "ลากบนปฏิทิน หรือแตะวันเช็กอินและเช็กเอาต์ ราคาต่อคืนแสดงอยู่ในแต่ละวัน",
        previous: "เดือนก่อน",
        next: "เดือนถัดไป",
        blocked: "ไม่ว่าง",
        past: "ผ่านมาแล้ว",
        selectStart: "เลือกวันเช็กอิน",
        selectEnd: "เลือกวันเช็กเอาต์",
        checkIn: "เช็กอิน",
        checkOut: "เช็กเอาต์",
        stay: "วันเข้าพัก",
        nights: "คืน",
        estimate: "ยอดรวม",
        conflict: "ช่วงวันที่นี้มีวันที่ไม่ว่าง กรุณาเลือกช่วงอื่น",
        oneNight: "เลือกอย่างน้อย 1 คืน",
        contactTitle: "ข้อมูลติดต่อ",
        contactBody: "กรอกเบอร์โทรหรือ LINE ID อย่างใดอย่างหนึ่ง",
        phone: "เบอร์โทร",
        phoneInvalid: "กรอกเบอร์โทรที่ถูกต้อง 8–15 หลัก",
        line: "LINE ID",
        send: "ขอจอง",
        privacyNotice: "เราจะใช้ข้อมูลนี้เพื่อติดต่อคุณเกี่ยวกับการเข้าพัก",
        received: "ขอบคุณ เราได้รับข้อมูลแล้ว",
        receivedBody: "ทีมงานจะติดต่อคุณทางโทรศัพท์หรือ LINE เร็ว ๆ นี้",
        unavailableQuote: "วันที่ดังกล่าวไม่ว่างแล้ว กรุณาเลือกใหม่",
        loading: "กำลังตรวจสอบราคา…",
      }
    : {
        title: "Choose your stay",
        lead: "Drag across the calendar, or tap check-in and check-out. Each available day shows its nightly rate.",
        previous: "Previous month",
        next: "Next month",
        blocked: "Unavailable",
        past: "Past",
        selectStart: "Choose check-in",
        selectEnd: "Choose check-out",
        checkIn: "Check-in",
        checkOut: "Check-out",
        stay: "Stay",
        nights: "nights",
        estimate: "Total",
        conflict:
          "That range includes an unavailable night. Choose another range.",
        oneNight: "Choose at least one night.",
        contactTitle: "Contact details",
        contactBody: "Enter a phone number or LINE ID. Only one is required.",
        phone: "Phone number",
        phoneInvalid: "Enter a valid phone number with 8–15 digits.",
        line: "LINE ID",
        send: "Request to book",
        privacyNotice: "We'll use these details to contact you about your stay.",
        received: "Thanks — we received your details",
        receivedBody: "Our team will contact you by phone or LINE shortly.",
        unavailableQuote:
          "Those dates are no longer available. Choose another stay.",
        loading: "Checking the live price…",
      };

  const monthLabel = new Intl.DateTimeFormat(th ? "th-TH" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(month);
  const weekdays = th
    ? ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cells = useMemo(() => {
    const year = month.getUTCFullYear(),
      monthIndex = month.getUTCMonth();
    const first = new Date(Date.UTC(year, monthIndex, 1));
    const leading = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: days }, (_, index) =>
        iso(new Date(Date.UTC(year, monthIndex, index + 1))),
      ),
    ];
  }, [month]);

  function nightlyRate(date: string) {
    const match = props.rates
      .filter((rate) => rate.recurringDay === "sunday"
        ? atUtc(date).getUTCDay() === 0
        : rate.startDate <= date && date < rate.endDate)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (match)
      return {
        price: match.nightlyPriceThb,
      };
    const day = atUtc(date).getUTCDay();
    const weekend = day === 5 || day === 6;
    return {
      price: weekend
        ? (props.weekendPriceThb ?? props.weekdayPriceThb)
        : props.weekdayPriceThb,
    };
  }
  function isBlocked(date: string) {
    return props.unavailable.some(
      (block) => block.startDate <= date && date < block.endDate,
    );
  }
  function hasConflict(start: string, end: string) {
    return props.unavailable.some((block) =>
      overlaps(start, end, block.startDate, block.endDate),
    );
  }
  function displayRange(date: string) {
    if (anchor && hover) {
      const start = anchor < hover ? anchor : hover;
      const end = anchor < hover ? hover : anchor;
      return date >= start && date <= end;
    }
    return Boolean(checkIn && checkOut && date >= checkIn && date <= checkOut);
  }
  function finalise(other: string) {
    if (!anchor) {
      setAnchor(other);
      setHover(other);
      setSelectionError("");
      return;
    }
    const start = anchor < other ? anchor : other;
    const end = anchor < other ? other : anchor;
    if (start === end) {
      setSelectionError(copy.oneNight);
      setHover(other);
      return;
    }
    if (hasConflict(start, end)) {
      setSelectionError(copy.conflict);
      setAnchor(null);
      setHover(null);
      setDragging(false);
      return;
    }
    setCheckIn(start);
    setCheckOut(end);
    setAnchor(null);
    setHover(null);
    setDragging(false);
    setSelectionError("");
    setSubmitted(false);
    submissionKey.current = crypto.randomUUID();
  }
  function onDayPointerDown(
    date: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    if (date < today || isBlocked(date)) return;
    event.preventDefault();
    if (!anchor) {
      setAnchor(date);
      setHover(date);
      setCheckIn("");
      setCheckOut("");
    } else setHover(date);
    setDragging(true);
    setSelectionError("");
  }
  function onGridPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !anchor) return;
    const element = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-calendar-date]");
    const date = element?.dataset.calendarDate;
    if (date && date >= today && !isBlocked(date)) setHover(date);
  }
  function onGridPointerUp() {
    if (!dragging) return;
    setDragging(false);
    suppressClick.current = true;
    if (hover && hover !== anchor) finalise(hover);
  }
  function onDayClick(date: string) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (date < today || isBlocked(date) || dragging) return;
    if (!anchor) {
      setAnchor(date);
      setHover(date);
      setCheckIn("");
      setCheckOut("");
      setSelectionError("");
    } else finalise(date);
  }
  function changeMonth(amount: number) {
    setMonth(
      (value) =>
        new Date(
          Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1),
        ),
    );
    setAnchor(null);
    setHover(null);
    setDragging(false);
  }

  const selectedNights = quote?.available
    ? quote.nights.length
    : checkIn && checkOut
      ? Math.round(
          (atUtc(checkOut).getTime() - atUtc(checkIn).getTime()) / 86_400_000,
        )
      : 0;
  const hasSelectedStay = Boolean(checkIn && checkOut);
  const showContact = hasSelectedStay && quote?.available === true;
  const compactDate = (value: string) =>
    new Intl.DateTimeFormat(th ? "th-TH" : "en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(atUtc(value));
  return (
    <section
      id="availability"
      className={props.embedded ? "min-w-0" : "border-y border-[var(--line)] bg-[#f3f7f6] px-4 py-12 sm:px-8 lg:px-12"}
    >
      <div className={props.embedded ? "min-w-0" : "mx-auto max-w-[1120px]"}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--terracotta)]">
              {th ? "วันว่างและราคา" : "Availability & rates"}
            </p>
            <h2 className={`mt-2 font-serif text-3xl font-semibold ${props.embedded ? "sm:text-4xl" : "sm:text-5xl"}`}>
              {copy.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--soft)]">
              {copy.lead}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[var(--terracotta)]" />
              {th ? "วันที่เลือก" : "Selected"}
            </span>
            <span className="flex items-center gap-2">
              <span className="calendar-blocked size-3 rounded-full border border-[var(--line)]" />
              {copy.blocked}
            </span>
          </div>
        </div>
        <div className="mt-7 rounded-2xl shadow-[0_18px_50px_rgba(0,19,38,.08)]">
        <div className={`overflow-hidden border border-[var(--line)] bg-white ${hasSelectedStay ? "rounded-t-2xl border-b-0" : "rounded-2xl"}`}>
          <div className="flex items-center justify-between px-3 pb-4 pt-4 sm:px-6 sm:pt-5">
            <button
              type="button"
              aria-label={copy.previous}
              disabled={
                month.getUTCFullYear() === atUtc(today).getUTCFullYear() &&
                month.getUTCMonth() === atUtc(today).getUTCMonth()
              }
              onClick={() => changeMonth(-1)}
              className="flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-white transition hover:border-[var(--pool)] disabled:pointer-events-none disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-serif text-xl font-semibold capitalize sm:text-2xl">
              {monthLabel}
            </h3>
            <button
              type="button"
              aria-label={copy.next}
              onClick={() => changeMonth(1)}
              className="flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-white transition hover:border-[var(--pool)] focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="mx-3 grid grid-cols-7 border-y border-[var(--line)] py-2 text-[var(--soft)] sm:mx-5">
            {weekdays.map((day) => (
              <div
                key={day}
                className="text-center font-mono text-[9px] font-bold uppercase tracking-[.08em] sm:text-[10px]"
              >
                {day}
              </div>
            ))}
          </div>
          <div
            ref={gridRef}
            onPointerMove={onGridPointerMove}
            onPointerUp={onGridPointerUp}
            onPointerCancel={() => {
              setDragging(false);
              setAnchor(null);
              setHover(null);
            }}
            className="grid touch-pan-y select-none grid-cols-7 bg-white px-3 pb-2 pt-1.5 sm:px-5 sm:pb-4 sm:pt-2"
          >
            {cells.map((date, index) => {
              if (!date)
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-10 sm:min-h-16"
                  />
                );
              const past = date < today,
                blocked = isBlocked(date),
                selected = displayRange(date),
                isStart =
                  date ===
                  (anchor && hover
                    ? anchor < hover
                      ? anchor
                      : hover
                    : checkIn),
                isEnd =
                  date ===
                  (anchor && hover
                    ? anchor < hover
                      ? hover
                      : anchor
                    : checkOut),
                rate = nightlyRate(date);
              const previousDate = index > 0 ? cells[index - 1] : null;
              const nextDate = index < cells.length - 1 ? cells[index + 1] : null;
              const blockedBefore = Boolean(previousDate && isBlocked(previousDate));
              const blockedAfter = Boolean(nextDate && isBlocked(nextDate));
              const blockedShape = blockedBefore
                ? blockedAfter
                  ? "rounded-none"
                  : "rounded-l-none rounded-r-lg"
                : blockedAfter
                  ? "rounded-l-lg rounded-r-none"
                  : "rounded-lg";
              const selectionShape = isStart && isEnd
                ? "rounded-xl"
                : isStart
                  ? "rounded-l-xl rounded-r-none"
                  : isEnd
                    ? "rounded-l-none rounded-r-xl"
                    : "rounded-none";
              return (
                <button
                  key={date}
                  type="button"
                  data-calendar-date={date}
                  disabled={past || blocked}
                  onPointerDown={(event) => onDayPointerDown(date, event)}
                  onPointerEnter={() => {
                    if (dragging && anchor && !past && !blocked) setHover(date);
                  }}
                  onClick={() => onDayClick(date)}
                  aria-label={`${formatNumericDate(date)}, ${blocked ? copy.blocked : past ? copy.past : money(rate.price)}`}
                  className={`relative flex min-h-10 flex-col justify-center overflow-hidden px-1.5 py-0.5 text-center transition sm:min-h-16 sm:justify-start sm:p-2 sm:text-left ${blocked ? `calendar-blocked ${blockedShape} cursor-not-allowed text-[var(--soft)]` : past ? "rounded-lg cursor-not-allowed text-[#b9b2a8]" : selected ? `${selectionShape} bg-[var(--terracotta)] text-white` : "rounded-lg bg-white hover:bg-[var(--paper)]"} focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--terracotta)]`}
                >
                  <span className="flex w-full items-start justify-center gap-1 sm:justify-between">
                    <span className="text-xs font-bold leading-none sm:text-sm">
                      {Number(date.slice(-2))}
                    </span>
                  </span>
                  {blocked ? (
                    <span className="mt-1 flex items-center justify-center gap-1 text-[8px] font-bold uppercase sm:mt-auto sm:text-[10px]">
                      <LockKeyhole size={10} />
                      <span className="hidden sm:inline">{copy.blocked}</span>
                    </span>
                  ) : !past ? (
                    <span
                      className={`font-price mt-1 block w-full truncate text-[8px] font-bold leading-none sm:mt-auto sm:text-base ${selected ? "text-white" : "text-[var(--ink)]"}`}
                    >
                      ฿{shortPrice(rate.price)}
                    </span>
                  ) : null}
                  {isStart ? (
                    <span className="absolute right-1 top-7 hidden text-[7px] font-bold uppercase sm:right-2 sm:block sm:text-[9px]">
                      {copy.checkIn}
                    </span>
                  ) : null}
                  {isEnd && !isStart ? (
                    <span className="absolute right-1 top-7 hidden text-[7px] font-bold uppercase sm:right-2 sm:block sm:text-[9px]">
                      {copy.checkOut}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        {hasSelectedStay ? (
            <div aria-live="polite" className={`border border-[var(--line)] bg-white p-4 sm:p-5 ${showContact ? "border-b-0" : "rounded-b-2xl"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[var(--soft)]">
                    {copy.stay}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                    <time dateTime={checkIn}>{compactDate(checkIn)}</time>
                    <span className="text-[var(--soft)]">→</span>
                    <time dateTime={checkOut}>{compactDate(checkOut)}</time>
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--soft)]">
                    {selectedNights} {copy.nights}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[var(--soft)]">
                    {copy.estimate}
                  </p>
                  <strong className="font-price mt-1 block text-2xl font-semibold leading-none sm:text-3xl">
                    {quote?.available ? money(quote.totalThb) : "—"}
                  </strong>
                </div>
              </div>
              <div className="mt-3 border-t border-[var(--line)] pt-3">
              {quote === undefined ? (
                  <p className="flex items-center gap-2 text-xs text-[var(--soft)]">
                    <LoaderCircle size={13} className="animate-spin" />
                    {copy.loading}
                  </p>
              ) : quote.available ? (
                <>
                  <div>
                    <details className="w-full text-xs text-[var(--soft)]">
                      <summary className="cursor-pointer font-bold underline underline-offset-2">
                        {th ? "ดูราคาแต่ละคืน" : "Nightly breakdown"}
                      </summary>
                      <div className="mt-2 grid w-full gap-1.5">
                      {quote.nights.map((night) => (
                        <span key={night.date} className="flex justify-between gap-4">
                          <time dateTime={night.date}>{compactDate(night.date)}</time>
                          <span className="font-price">{money(night.priceThb)}</span>
                        </span>
                      ))}
                      </div>
                    </details>
                  </div>
                </>
                ) : (
                  <p className="mt-3 text-sm font-bold text-[#963b30]">
                    {copy.unavailableQuote}
                  </p>
                )}
              </div>
            </div>
        ) : null}
        {showContact ? (
          <div className="rounded-b-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr_auto] lg:items-end">
              <div>
                <h3 className="font-serif text-2xl font-semibold">
                  {copy.contactTitle}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--soft)]">
                  {copy.contactBody}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} />
                    {copy.phone}
                  </span>
                  <input
                    value={phone}
                    onChange={(event) => { setPhone(event.target.value); setSubmitError(""); }}
                    type="tel"
                    autoComplete="tel"
                    aria-invalid={phone.trim() && !isValidPhoneNumber(phone) ? true : undefined}
                    aria-describedby={phone.trim() && !isValidPhoneNumber(phone) ? "booking-phone-error" : undefined}
                    className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm focus:border-[var(--pool)] focus:bg-white focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] aria-invalid:border-[#9a3f32]"
                  />
                  {phone.trim() && !isValidPhoneNumber(phone) ? <span id="booking-phone-error" className="mt-1.5 block text-[11px] font-medium text-[#9a3f32]">{copy.phoneInvalid}</span> : null}
                </label>
                <label className="text-xs font-bold">
                  <span>LINE · {copy.line}</span>
                  <input
                    value={lineId}
                    onChange={(event) => setLineId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm focus:border-[var(--pool)] focus:bg-white focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={submitting || (!phone.trim() && !lineId.trim()) || !isValidPhoneNumber(phone)}
                onClick={async () => {
                  setSubmitError("");
                  if (!isValidPhoneNumber(phone)) { setSubmitError(copy.phoneInvalid); return; }
                  setSubmitting(true);
                  try {
                    await submitRequest({
                      villaId: props.villaId,
                      checkIn,
                      checkOut,
                      ...(props.initialGuests !== undefined
                        ? { guestCount: props.initialGuests }
                        : {}),
                      phone,
                      lineId,
                      idempotencyKey: submissionKey.current,
                    });
                    setSubmitted(true);
                  } catch (error) {
                    setSubmitError(bookingSubmitErrorMessage(error, props.locale));
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--terracotta)] px-6 text-sm font-bold text-white hover:bg-[#a96549] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--navy)]"
              >
                {submitting ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}{" "}
                {copy.send}
              </button>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-[var(--soft)]">
              {copy.privacyNotice}
            </p>
            {submitError ? (
              <p role="alert" className="mt-3 text-sm font-bold text-[#963b30]">
                {submitError}
              </p>
            ) : null}
            {submitted ? (
              <div className="mt-4 flex gap-3 rounded-xl border border-[#add0bf] bg-[#f0f8f4] p-4">
                <CheckCircle2 className="shrink-0 text-[var(--green)]" />
                <div>
                  <p className="font-bold">{copy.received}</p>
                  <p className="mt-1 text-sm text-[var(--soft)]">
                    {copy.receivedBody}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        </div>
        {selectionError || anchor ? (
          <div aria-live="polite" className="mt-5">
            {selectionError ? (
              <p
                role="alert"
                className="rounded-xl border border-[#e6b8ad] bg-[#fff5f2] p-3 text-sm font-semibold text-[#963b30]"
              >
                {selectionError}
              </p>
            ) : (
              <p className="rounded-xl bg-white p-3 text-center text-sm font-semibold shadow-sm">
                {copy.selectEnd}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
