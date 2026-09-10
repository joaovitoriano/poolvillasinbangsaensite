"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import type { DayCellContentArg } from "@fullcalendar/core";
import thLocale from "@fullcalendar/core/locales/th";
import { useQuery } from "convex/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BookingDialog } from "@/components/booking-dialog";
import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useLocale } from "@/components/locale-provider";

const CalendarGrid = memo(FullCalendar);
const calendarPlugins = [dayGridPlugin, interactionPlugin];
const calendarLocales = [thLocale];
const PREVIOUS_MONTHS = 3;
const NEXT_MONTHS = 12;

function offsetMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compactThb(value: number) {
  if (value < 1_000) return `${value}฿`;
  const thousands = value / 1_000;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k฿`;
}

export function VillaCalendar({ villaId, initialClosedDateId }: { villaId: Id<"villas">; initialClosedDateId?: Id<"closedDates"> }) {
  return <VillaCalendarContent key={villaId} villaId={villaId} initialClosedDateId={initialClosedDateId} />;
}

function VillaCalendarContent({ villaId, initialClosedDateId }: { villaId: Id<"villas">; initialClosedDateId?: Id<"closedDates"> }) {
  const { locale, t } = useLocale();
  const calendarRef = useRef<FullCalendar>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [initialMonth] = useState(() => localDateKey(new Date()).slice(0, 7));
  const [month, setMonth] = useState(initialMonth);
  const [selection, setSelection] = useState<{ date: string; bookingId?: Id<"bookings">; closedDateId?: Id<"closedDates"> } | undefined>(() => initialClosedDateId ? { date: localDateKey(new Date()), closedDateId: initialClosedDateId } : undefined);
  const [fontsReady, setFontsReady] = useState(false);
  const today = localDateKey(new Date());
  // This subscription is independent of the selected month. All navigation
  // uses the same live snapshot, including prices and permission-safe events.
  const data = useQuery(api.calendar.range, {
    villaId,
    from: `${offsetMonth(initialMonth, -PREVIOUS_MONTHS)}-01`,
    to: `${offsetMonth(initialMonth, NEXT_MONTHS + 1)}-01`,
  });
  const ready = data !== undefined && carouselApi !== undefined && fontsReady;
  const days = useMemo(() => new Map(data?.days.map((day) => [day.date, {
    ...day,
    price: day.nightlyPriceThb === null ? null : compactThb(day.nightlyPriceThb),
  }])), [data]);
  const months = useMemo(() => {
    return Array.from({ length: PREVIOUS_MONTHS + 1 + NEXT_MONTHS }, (_, index) => {
      const key = offsetMonth(initialMonth, index - PREVIOUS_MONTHS);
      const date = new Date(`${key}-01T00:00:00.000Z`);
      return {
        key,
        label: new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { month: "short", timeZone: "UTC" }).format(date),
        year: date.getUTCFullYear(),
      };
    });
  }, [initialMonth, locale]);
  const bookingByDate = useMemo(() => {
    const result = new Map<string, Id<"bookings">>();
    for (const booking of data?.bookings ?? []) {
      const date = new Date(`${booking.checkIn}T00:00:00.000Z`);
      for (let key = booking.checkIn; key < booking.checkOut; key = date.toISOString().slice(0, 10)) {
        result.set(key, booking._id);
        date.setUTCDate(date.getUTCDate() + 1);
      }
    }
    return result;
  }, [data]);
  const activeYear = Number(month.slice(0, 4));
  const carouselOptions = useMemo(() => ({
    align: "center" as const, loop: true, skipSnaps: true, slidesToScroll: 1,
    startIndex: PREVIOUS_MONTHS,
  }), []);
  const selectMonth = useCallback((key: string) => {
    const calendar = calendarRef.current?.getApi();
    if (calendar && localDateKey(calendar.getDate()).slice(0, 7) !== key) {
      calendar.gotoDate(`${key}-01`);
    }
    setMonth(key);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Load both alphabets before revealing the calendar, including a later
    // language switch. Failed font requests settle and use the fallback font.
    const fontFamily = getComputedStyle(document.body).fontFamily;
    void Promise.allSettled([
      document.fonts.load(`12px ${fontFamily}`, "September 0123456789"),
      document.fonts.load(`12px ${fontFamily}`, "กันยายน ฿"),
    ]).then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => {
      const selected = months[carouselApi.selectedScrollSnap()];
      if (selected) selectMonth(selected.key);
    };
    carouselApi.on("select", onSelect);
    return () => { carouselApi.off("select", onSelect); };
  }, [carouselApi, months, selectMonth]);
  const dateClick = useCallback((arg: DateClickArg) => {
    const day = days.get(arg.dateStr);
    if (!day) return;
    if (day.closedDateId) {
      setSelection({ date: arg.dateStr, closedDateId: day.closedDateId });
    } else if (day.booked) {
      const bookingId = bookingByDate.get(arg.dateStr);
      if (bookingId) setSelection({ date: arg.dateStr, bookingId });
    } else if (arg.dateStr >= today) {
      setSelection({ date: arg.dateStr });
    }
  }, [days, bookingByDate, today]);
  const dayCellClassNames = useCallback((arg: DayCellContentArg) => {
    const day = days.get(localDateKey(arg.date));
    return day ? [day.closedDateId ? "is-closed" : day.booked ? "is-booked" : "is-available"] : [];
  }, [days]);
  const dayCellContent = useCallback((arg: DayCellContentArg) => {
    const day = days.get(localDateKey(arg.date));
    if (!day || day.closedDateId || day.price === null) return <span className="calendar-day-number">{arg.dayNumberText}</span>;
    const effectivePrice = day.price;
    const priceDescription = t({ en: `${effectivePrice} nightly price`, th: `ราคาต่อคืน ${effectivePrice}` });
    return (
      <div className="calendar-day-content-wrap" aria-label={`${arg.dayNumberText}, ${priceDescription}`} title={day.isDefault ? t({ en: "Default", th: "ค่าเริ่มต้น" }) : day.presetName ?? undefined}>
        <div className="calendar-day-content">
        <span className="calendar-day-number">{arg.dayNumberText}</span>
        <span className="calendar-day-prices">
          <span className="calendar-day-effective-price">{effectivePrice}</span>
        </span>
        </div>
      </div>
    );
  }, [days, t]);
  return (
    <>
      <section aria-busy={!ready} className="calendar-shell mx-0 min-w-0 overflow-hidden bg-white">
        {!ready && <span role="status" className="sr-only">{t({ en: "Loading calendar", th: "กำลังโหลดปฏิทิน" })}</span>}
        <div className={ready ? undefined : "invisible"}>
        <div className="flex items-center justify-between gap-4 px-0">
          <div className="flex items-center gap-4 px-4 text-xs font-medium text-foreground">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-emerald-600" />{t({ en: "Available", th: "ว่าง" })}</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-rose-600" />{t({ en: "Booked", th: "จองแล้ว" })}</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-gray-500" />{t({ en: "Closed", th: "ปิด" })}</span>
          </div>
          <span className="shrink-0 px-4 text-[11px] font-medium text-muted-foreground">{t({ en: String(activeYear), th: `ปี ${activeYear}` })}</span>
        </div>
        <Carousel setApi={setCarouselApi} opts={carouselOptions} className="mt-3 min-w-0 px-0" aria-label={t({ en: "Choose month", th: "เลือกเดือน" })}>
          <CarouselContent className="-ml-1 pb-2">
            {months.map((item, index) => {
              const active = item.key === month;
              return <CarouselItem key={item.key} className="flex basis-1/3 justify-center pl-1"><button type="button" aria-current={active ? "date" : undefined} aria-label={`${item.label} ${item.year}`} onClick={() => { carouselApi?.scrollTo(index); selectMonth(item.key); }} className={`min-h-11 w-full rounded-md px-2 text-sm font-medium ${active ? "text-foreground underline underline-offset-8" : "text-muted-foreground active:underline "}`}>{item.label}</button></CarouselItem>;
            })}
          </CarouselContent>
        </Carousel>
        <div
          className="calendar-month-grid min-w-0 overflow-hidden"
        >
          {data ? <CalendarGrid
            ref={calendarRef}
            initialDate={`${initialMonth}-01`}
            plugins={calendarPlugins}
            initialView="dayGridMonth"
            locale={locale === "th" ? "th" : "en"}
            locales={calendarLocales}
            firstDay={1}
            aspectRatio={1}
            height="auto"
            expandRows={false}
            fixedWeekCount
            showNonCurrentDates={false}
            dateClick={dateClick}
            dayCellContent={dayCellContent}
            dayCellClassNames={dayCellClassNames}
            headerToolbar={false}
          /> : <div className="calendar-grid-placeholder" />}
        </div>
        </div>
      </section>
      {selection && <BookingDialog key={selection.closedDateId ?? selection.bookingId ?? selection.date} villaId={villaId} bookingId={selection.bookingId} closedDateId={selection.closedDateId} initialDate={selection.date} open onOpenChange={(open) => { if (!open) setSelection(undefined); }} trigger={false} />}
    </>
  );
}
