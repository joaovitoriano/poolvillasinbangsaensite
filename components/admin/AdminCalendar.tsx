"use client";

import * as Popover from "@radix-ui/react-popover";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { api } from "@/convex/_generated/api";
import { AdminEmptyState, AdminPanel, AdminSkeleton } from "./AdminUI";
import { useAdminLocale } from "./AdminLocale";
import { eventVisualEndExclusive, layoutCalendarEvents } from "./calendar-event-layout";
import { plainTextFromRichText, SafeRichText } from "./SafeRichText";

const DAY_MS = 86_400_000;
const iso = (date: Date) => date.toISOString().slice(0, 10);
function addDays(date: Date, amount: number) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + amount); return next; }
function startOfMonth(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); }
function monthBounds(date: Date) { const start = startOfMonth(date); return { start, end: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) }; }
function datesBetween(start: Date, end: Date) { return Array.from({ length: Math.round((end.getTime() - start.getTime()) / DAY_MS) }, (_, index) => addDays(start, index)); }
function carouselPageStarts(dayCount: number) { const starts = Array.from({ length: Math.ceil(dayCount / 7) }, (_, index) => index * 7); const finalStart = Math.max(0, dayCount - 7); starts[starts.length - 1] = finalStart; return Array.from(new Set(starts)); }

type PortfolioVillas = NonNullable<ReturnType<typeof useQuery<typeof api.availability.portfolioVillas>>>;
type PortfolioBlocks = NonNullable<ReturnType<typeof useQuery<typeof api.availability.portfolioBlocks>>>;
type AvailabilityBlock = PortfolioBlocks[number]["blocks"][number];
type PortfolioItem = { villa: PortfolioVillas[number]; blocks: AvailabilityBlock[] };
type Portfolio = PortfolioItem[];

function eventSegments(blocks: AvailabilityBlock[], days: Date[]) {
  return layoutCalendarEvents(blocks, days.map(iso));
}

function formatEventDate(value: string, locale: "en" | "th") {
  const formatter = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return formatter.format(new Date(`${value}T00:00:00.000Z`));
}

function formatClosedDates(block: AvailabilityBlock, locale: "en" | "th") {
  const inclusiveEnd = iso(addDays(new Date(`${block.endDate}T00:00:00.000Z`), -1));
  return `${formatEventDate(block.startDate, locale)} – ${formatEventDate(inclusiveEnd, locale)}`;
}

export function AdminCalendar() {
  const { locale, copy } = useAdminLocale();
  const now = new Date();
  const today = iso(now);
  const currentMonth = startOfMonth(now);
  const [anchor, setAnchor] = useState(currentMonth);
  const initialPage = Math.floor((now.getUTCDate() - 1) / 7);
  const [mobilePage, setMobilePage] = useState(initialPage);
  const pendingPage = useRef(initialPage);
  const carouselRef = useRef<HTMLDivElement>(null);
  const bounds = monthBounds(anchor);
  const desktopDays = useMemo(() => datesBetween(bounds.start, bounds.end), [bounds.end, bounds.start]);
  const mobilePageStarts = carouselPageStarts(desktopDays.length);
  const mobilePageCount = mobilePageStarts.length;
  const villas = useQuery(api.availability.portfolioVillas, {});
  const villaIds = useMemo(() => villas?.map((villa) => villa._id) ?? [], [villas]);
  const blockGroups = useQuery(api.availability.portfolioBlocks, villas === undefined ? "skip" : { villaIds, from: iso(bounds.start), to: iso(bounds.end) });
  const blocksByVilla = useMemo(() => new Map(blockGroups?.map((group) => [group.villaId, group.blocks]) ?? []), [blockGroups]);
  const portfolio = useMemo<Portfolio>(() => (villas ?? []).map((villa) => ({ villa, blocks: blocksByVilla.get(villa._id) ?? [] })), [blocksByVilla, villas]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    let alignedSize = "";
    const align = () => {
      const width = carousel.clientWidth;
      const size = `${width}:${carousel.scrollWidth}`;
      if (!width || size === alignedSize) return;
      alignedSize = size;
      carousel.scrollTo({ left: pendingPage.current * width, behavior: "auto" });
    };
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(align));
    const observer = new ResizeObserver(align);
    observer.observe(carousel);
    if (carousel.firstElementChild) observer.observe(carousel.firstElementChild);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, [anchor, blockGroups, villas]);

  function openMonth(next: Date, page = 0) {
    const nextBounds = monthBounds(next);
    const lastPage = carouselPageStarts(Math.round((nextBounds.end.getTime() - nextBounds.start.getTime()) / DAY_MS)).length - 1;
    const safePage = Math.max(0, Math.min(page, lastPage));
    pendingPage.current = safePage;
    setMobilePage(safePage);
    setAnchor(next);
  }

  function selectMonth(next: Date) {
    const isCurrentMonth = next.getUTCFullYear() === currentMonth.getUTCFullYear() && next.getUTCMonth() === currentMonth.getUTCMonth();
    openMonth(next, isCurrentMonth ? initialPage : 0);
  }
  function trackCarousel() {
    const carousel = carouselRef.current;
    if (!carousel || carousel.clientWidth === 0) return;
    const page = Math.max(0, Math.min(Math.round(carousel.scrollLeft / carousel.clientWidth), mobilePageCount - 1));
    if (page !== mobilePage) { pendingPage.current = page; setMobilePage(page); }
  }

  return <div className="space-y-4">
    <div><h2 className="text-sm font-semibold text-[#001e33]">{copy("Portfolio availability", "วันว่างของวิลล่าทั้งหมด")}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#68777a]">{copy("A read-only view of the availability customers see. Manage bookings and closed dates in Google Calendar.", "มุมมองแบบอ่านอย่างเดียวของวันว่างที่ลูกค้าเห็น จัดการการจองและวันที่ปิดใน Google ปฏิทิน")}</p></div>

    <AdminPanel className="-mx-4 !rounded-none !border-x-0 sm:-mx-6 md:mx-0 md:!rounded-2xl md:!border-x">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#ddd6ca] bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#68777a]"><Legend color="bg-white border border-[#ddd6ca]" label={copy("Available", "ว่าง")} /><Legend color="bg-[#c66f4e]" label={copy("Booked", "จองแล้ว")} /><Legend color="bg-[#8e9695]" label={copy("Closed", "ปิด")} /><Legend color="ring-2 ring-inset ring-[#0f6474]" label={copy("Today", "วันนี้")} /></div>
      </div>
      <AdminMonthScroller currentMonth={anchor} locale={locale} onMonthChange={selectMonth} />

      <div className="hidden overflow-x-auto md:block">
        {villas === undefined ? <AdminSkeleton rows={4} /> : portfolio.length === 0 ? <AdminEmptyState title={copy("No villas available", "ยังไม่มีวิลล่า")} detail={copy("Published and draft villas will appear here.", "วิลล่าที่เผยแพร่และฉบับร่างจะแสดงที่นี่")} /> : <PortfolioGrid portfolio={portfolio} days={desktopDays} locale={locale} copy={copy} today={today} mode="month" />}
      </div>

      <div className="md:hidden">
        {villas === undefined ? <AdminSkeleton rows={4} /> : portfolio.length === 0 ? <AdminEmptyState title={copy("No villas available", "ยังไม่มีวิลล่า")} detail={copy("Published and draft villas will appear here.", "วิลล่าที่เผยแพร่และฉบับร่างจะแสดงที่นี่")} /> : <MobilePortfolioCarousel portfolio={portfolio} days={desktopDays} activePage={mobilePage} locale={locale} copy={copy} today={today} scrollRef={carouselRef} onScroll={trackCarousel} />}
      </div>
    </AdminPanel>

  </div>;
}

function PortfolioGrid({ portfolio, days, locale, copy, today, mode }: { portfolio: Portfolio; days: Date[]; locale: "en" | "th"; copy: (english: string, thai: string) => string; today: string; mode: "month" | "week" }) {
  const columns = mode === "month" ? `190px repeat(${days.length}, minmax(29px, 1fr))` : "112px repeat(7, minmax(0, 1fr))";
  return <div role="table" aria-label={copy("Villa availability", "วันว่างของวิลล่า")} className={mode === "month" ? "min-w-[1110px]" : "w-full"}>
    <div role="row" className="grid border-b border-[#e8e2d8] bg-[#f8f6f1]" style={{ gridTemplateColumns: columns }}>
      <div role="columnheader" className="sticky left-0 z-20 border-r border-[#ddd6ca] bg-[#f8f6f1] px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-[#68777a]">{copy("Villa", "วิลล่า")}</div>
      {days.map((day) => { const date = iso(day); const weekend = [0, 6].includes(day.getUTCDay()); return <div role="columnheader" key={date} className={`border-r border-[#ece7df] py-1.5 text-center ${weekend ? "bg-[#f0ece4]" : ""} ${date === today ? "ring-2 ring-inset ring-[#0f6474]" : ""}`}><span className="block text-[8px] uppercase text-[#7b8586]">{day.toLocaleDateString(locale === "th" ? "th-TH" : "en", { weekday: "narrow", timeZone: "UTC" })}</span><strong className="block text-[10px] text-[#163038]">{day.getUTCDate()}</strong></div>; })}
    </div>
    {portfolio.map((item) => { const segments = eventSegments(item.blocks, days); const laneCount = Math.max(1, ...segments.map(({ lane }) => lane + 1)); return <div role="row" key={item.villa._id} className="grid border-b border-[#ece7df] last:border-b-0" style={{ gridTemplateColumns: columns, gridTemplateRows: `repeat(${laneCount}, auto)` }}>
      <div role="rowheader" style={{ gridColumn: 1, gridRow: `1 / span ${laneCount}` }} className="sticky left-0 z-10 flex min-w-0 items-center border-r border-[#ddd6ca] bg-white px-3 py-2"><span className="block min-w-0 truncate whitespace-nowrap text-[11px] font-semibold text-[#001e33]" title={locale === "th" ? item.villa.nameTh : item.villa.nameEn}>{locale === "th" ? item.villa.nameTh : item.villa.nameEn}</span></div>
      {days.map((day, dayIndex) => <AvailabilityCell key={iso(day)} item={item} date={iso(day)} today={today} copy={copy} gridColumn={dayIndex + 2} rowSpan={laneCount} />)}
      {segments.map(({ block, startIndex, endIndex, lane }) => <CalendarEventBox key={block._id} block={block} lane={lane} locale={locale} copy={copy} gridStart={startIndex + 2} gridEnd={endIndex + 2} layout="desktop" />)}
    </div>; })}
  </div>;
}

function AdminMonthScroller({ currentMonth, locale, onMonthChange }: { currentMonth: Date; locale: "en" | "th"; onMonthChange: (month: Date) => void }) {
  const [months] = useState(() => {
    const present = startOfMonth(new Date());
    return Array.from({ length: 37 }, (_, index) => new Date(Date.UTC(present.getUTCFullYear(), present.getUTCMonth() + index - 12, 1)));
  });
  const monthKey = (month: Date) => `${month.getUTCFullYear()}-${month.getUTCMonth()}`;
  const initialIndex = Math.max(0, months.findIndex((month) => monthKey(month) === monthKey(currentMonth)));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number | null>(null);
  const currentMonthRef = useRef(currentMonth);
  const onMonthChangeRef = useRef(onMonthChange);

  useEffect(() => {
    currentMonthRef.current = currentMonth;
    onMonthChangeRef.current = onMonthChange;
  });

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const index = months.findIndex((month) => monthKey(month) === monthKey(currentMonth));
    if (index < 0) return;
    setActiveIndex(index);
    let alignedWidth = 0;
    const align = () => {
      const width = scroller.clientWidth;
      if (!width || width === alignedWidth) return;
      alignedWidth = width;
      scroller.scrollTo({ left: index * (width / 3), behavior: "auto" });
    };
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(align));
    const observer = new ResizeObserver(align);
    observer.observe(scroller);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, [currentMonth, months]);

  useEffect(() => () => { if (settleTimer.current !== null) window.clearTimeout(settleTimer.current); }, []);

  function nearestMonthIndex() {
    const scroller = scrollRef.current;
    if (!scroller || !scroller.clientWidth) return activeIndex;
    return Math.max(0, Math.min(Math.round(scroller.scrollLeft / (scroller.clientWidth / 3)), months.length - 1));
  }

  function settleMonth() {
    const index = nearestMonthIndex();
    const month = months[index];
    if (month && monthKey(month) !== monthKey(currentMonthRef.current)) onMonthChangeRef.current(month);
  }

  function trackMonths() {
    const index = nearestMonthIndex();
    if (index !== activeIndex) setActiveIndex(index);
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(settleMonth, 120);
  }

  function showMonth(index: number) {
    const scroller = scrollRef.current;
    if (!scroller) return;
    setActiveIndex(index);
    const month = months[index];
    if (month && monthKey(month) !== monthKey(currentMonthRef.current)) onMonthChangeRef.current(month);
    scroller.scrollTo({ left: index * (scroller.clientWidth / 3), behavior: "smooth" });
  }

  return <div className="border-b border-[#ddd6ca] bg-white px-1 py-2">
    <div ref={scrollRef} onScroll={trackMonths} className="snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex">
        <div aria-hidden="true" className="shrink-0 basis-1/3" />
        {months.map((month, index) => { const selected = index === activeIndex; return <button key={monthKey(month)} type="button" aria-current={selected ? "date" : undefined} onClick={() => showMonth(index)} className={`flex shrink-0 basis-1/3 snap-center items-center justify-center py-2 transition-[color,font-size] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c66f4e] ${selected ? "text-base font-semibold text-[#001e33]" : "text-sm text-[#9aa3a3]"}`}>{month.toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}</button>; })}
        <div aria-hidden="true" className="shrink-0 basis-1/3" />
      </div>
    </div>
  </div>;
}

function MobilePortfolioCarousel({ portfolio, days, activePage, locale, copy, today, scrollRef, onScroll }: { portfolio: Portfolio; days: Date[]; activePage: number; locale: "en" | "th"; copy: (english: string, thai: string) => string; today: string; scrollRef: RefObject<HTMLDivElement | null>; onScroll: () => void }) {
  const pages = carouselPageStarts(days.length).map((start) => days.slice(start, start + 7));
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [rowHeights, setRowHeights] = useState<number[]>([]);

  useLayoutEffect(() => {
    const page = pageRefs.current[activePage];
    if (!page) return;
    const rows = Array.from(page.querySelectorAll<HTMLElement>("[data-villa-row]"));
    const measure = () => {
      const next = rows.map((row) => row.getBoundingClientRect().height);
      setRowHeights((current) => current.length === next.length && current.every((height, index) => Math.abs(height - next[index]) < 0.5) ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [activePage, portfolio]);

  return <div role="table" aria-label={copy("Villa availability", "วันว่างของวิลล่า")} className="relative flex w-full overflow-hidden">
    <div className="w-28 shrink-0 border-r border-[#ddd6ca] bg-white">
      <div role="columnheader" className="flex h-10 items-center bg-[#f8f6f1] px-3 font-mono text-[9px] uppercase tracking-wider text-[#68777a]">{copy("Villa", "วิลล่า")}</div>
      {portfolio.map((item, itemIndex) => <div role="rowheader" key={item.villa._id} className="flex min-w-0 items-center bg-white px-3 py-1.5" style={rowHeights[itemIndex] ? { height: rowHeights[itemIndex] } : undefined}><span className="block min-w-0 truncate whitespace-nowrap text-[11px] font-semibold text-[#001e33]" title={locale === "th" ? item.villa.nameTh : item.villa.nameEn}>{locale === "th" ? item.villa.nameTh : item.villa.nameEn}</span></div>)}
    </div>
    <div ref={scrollRef} onScroll={onScroll} className="min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex">
        {pages.map((pageDays, pageIndex) => <div ref={(node) => { pageRefs.current[pageIndex] = node; }} key={pageIndex} className="min-w-full snap-start snap-always">
          <div role="row" className="grid h-10 grid-cols-7 bg-[#f8f6f1]">
            {pageDays.map((day) => <MobileDayHeader key={iso(day)} day={day} locale={locale} today={today} />)}
          </div>
          {portfolio.map((item) => { const segments = eventSegments(item.blocks, pageDays); const laneCount = Math.max(1, ...segments.map(({ lane }) => lane + 1)); return <div role="row" data-villa-row key={item.villa._id} className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${laneCount}, auto)` }}>
            {pageDays.map((day, dayIndex) => <AvailabilityCell key={iso(day)} item={item} date={iso(day)} today={today} copy={copy} gridColumn={dayIndex + 1} rowSpan={laneCount} />)}
            <span aria-hidden="true" className="pointer-events-none invisible col-span-7 row-start-1 mx-0.5 my-1 px-2 py-1 text-[11px] font-semibold leading-[14px]">{"\u00a0"}</span>
            {segments.map(({ block, startIndex, endIndex, lane }) => <CalendarEventBox key={block._id} block={block} lane={lane} locale={locale} copy={copy} gridStart={startIndex + 1} gridEnd={endIndex + 1} layout="mobile" />)}
          </div>; })}
        </div>)}
      </div>
    </div>
    {rowHeights.length === portfolio.length ? portfolio.slice(0, -1).map((item, index) => <span key={item.villa._id} aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-[5] border-t border-[#d8ded9]" style={{ top: 40 + rowHeights.slice(0, index + 1).reduce((total, height) => total + height, 0) }} />) : null}
  </div>;
}

function MobileDayHeader({ day, locale, today }: { day: Date; locale: "en" | "th"; today: string }) {
  const date = iso(day);
  const weekend = [0, 6].includes(day.getUTCDay());
  return <div role="columnheader" className={`flex min-w-0 flex-col items-center justify-center border-r border-[#ece7df] text-center ${weekend ? "bg-[#f0ece4]" : ""} ${date === today ? "ring-2 ring-inset ring-[#0f6474]" : ""}`}><span className="block text-[8px] uppercase text-[#7b8586]">{day.toLocaleDateString(locale === "th" ? "th-TH" : "en", { weekday: "narrow", timeZone: "UTC" })}</span><strong className="block text-[10px] text-[#163038]">{day.getUTCDate()}</strong></div>;
}

function AvailabilityCell({ item, date, today, copy, gridColumn, rowSpan }: { item: PortfolioItem; date: string; today: string; copy: (english: string, thai: string) => string; gridColumn: number; rowSpan: number }) {
  const blocks = item.blocks.filter((candidate) => candidate.startDate <= date && eventVisualEndExclusive(candidate) > date);
  const title = blocks.length ? blocks.map((block) => block.kind === "closed" ? copy(`Closed · ${block.name}`, `ปิด · ${block.name}`) : copy(`Booked · ${block.name}`, `จองแล้ว · ${block.name}`)).join("; ") : copy("Available", "ว่าง");
  return <div role="cell" aria-label={`${date}: ${title}`} style={{ gridColumn, gridRow: `1 / span ${rowSpan}` }} className={`h-full border-r border-[#ece7df] bg-white ${date === today ? "ring-2 ring-inset ring-[#0f6474]" : ""}`} />;
}

function CalendarEventBox({ block, lane, locale, copy, gridStart, gridEnd, layout }: { block: AvailabilityBlock; lane: number; locale: "en" | "th"; copy: (english: string, thai: string) => string; gridStart: number; gridEnd: number; layout: "desktop" | "mobile" }) {
  const [open, setOpen] = useState(false);
  const [centered, setCentered] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const pointerType = useRef<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const closed = block.kind === "closed";
  const plainName = plainTextFromRichText(block.name);
  const title = closed ? copy(`Closed · ${plainName}`, `ปิด · ${plainName}`) : copy(`Booked · ${plainName}`, `จองแล้ว · ${plainName}`);
  const layoutVisible = layout === "mobile" ? compactViewport : !compactViewport;
  const effectiveOpen = open && layoutVisible;
  const centerPanel = centered;
  const promoteToCentered = useCallback(() => setCentered(true), []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const updateViewport = () => {
      setCompactViewport(media.matches);
      const visible = layout === "mobile" ? media.matches : !media.matches;
      if (!visible) { setOpen(false); setCentered(false); }
    };
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, [layout]);

  useEffect(() => {
    if (!effectiveOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || trigger.current?.contains(target) || content.current?.contains(target)) return;
      if (event.pointerType === "touch") event.preventDefault();
      setOpen(false); setCentered(false);
    };
    document.addEventListener("pointerdown", closeOutside, true);
    return () => document.removeEventListener("pointerdown", closeOutside, true);
  }, [effectiveOpen]);

  return <Popover.Root open={effectiveOpen} onOpenChange={(nextOpen) => { if (centerPanel && !nextOpen) return; if (layoutVisible && pointerType.current !== "mouse") setOpen(nextOpen); }}>
    <Popover.Trigger asChild>
      <button
        ref={trigger}
        type="button"
        aria-label={title}
        aria-expanded={effectiveOpen}
        style={{
          gridColumn: `${gridStart} / ${gridEnd}`,
          gridRow: lane + 1,
        }}
        onPointerDown={(event) => { pointerType.current = event.pointerType; }}
        onPointerEnter={(event) => { pointerType.current = event.pointerType; if (event.pointerType === "mouse") setOpen(true); }}
        onPointerLeave={(event) => { if (event.pointerType === "mouse") setOpen(false); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); setCentered(false); }
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen((current) => !current); }
        }}
        className={`z-[1] mx-0.5 my-1 flex self-start items-center justify-center overflow-hidden rounded px-2 py-1 text-center text-[11px] font-semibold leading-[14px] text-white outline-none transition focus-visible:ring-2 focus-visible:ring-[#001e33] focus-visible:ring-offset-1 ${closed ? "bg-[#8e9695] hover:bg-[#737c7b]" : "bg-[#c66f4e] hover:bg-[#ad5c3e]"}`}
      >
        {closed ? <span className="block truncate">{copy("Closed", "ปิด")}</span> : <SafeRichText value={block.name} compact className="block truncate" />}
      </button>
    </Popover.Trigger>
    {effectiveOpen && centerPanel ? createPortal(<div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6"><div ref={content} role="dialog" aria-label={title} className="pointer-events-auto relative max-h-[calc(100dvh-1.5rem)] w-[min(28rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-lg border border-[#d9d3c8] bg-white p-4 pr-11 text-left shadow-[0_18px_55px_rgba(0,30,51,.22)] outline-none sm:max-h-[calc(100dvh-3rem)] sm:p-5 sm:pr-12"><button type="button" aria-label={copy("Close", "ปิด")} title={copy("Close", "ปิด")} onClick={() => { setOpen(false); setCentered(false); trigger.current?.focus(); }} className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-xl leading-none text-[#526266] transition hover:bg-[#f0ece4] hover:text-[#001e33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6474]">×</button><CalendarEventDetails block={block} closed={closed} locale={locale} copy={copy} /></div></div>, document.body) : !centerPanel ? <AnchoredCalendarEventPopover contentRef={content} block={block} closed={closed} locale={locale} copy={copy} onOverflow={promoteToCentered} onClose={() => { setOpen(false); setCentered(false); }} /> : null}
  </Popover.Root>;
}

function AnchoredCalendarEventPopover({ contentRef, block, closed, locale, copy, onOverflow, onClose }: { contentRef: RefObject<HTMLDivElement | null>; block: AvailabilityBlock; closed: boolean; locale: "en" | "th"; copy: (english: string, thai: string) => string; onOverflow: () => void; onClose: () => void }) {
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const attachPanel = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    setPanel(node);
  }, [contentRef]);

  useLayoutEffect(() => {
    if (!panel) return;
    const measure = () => {
      const bounds = panel.getBoundingClientRect();
      const viewportPadding = 12;
      if (panel.scrollHeight > panel.clientHeight
        || panel.scrollWidth > panel.clientWidth
        || bounds.top < viewportPadding
        || bounds.left < viewportPadding
        || bounds.right > window.innerWidth - viewportPadding
        || bounds.bottom > window.innerHeight - viewportPadding) onOverflow();
    };
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => { secondFrame = window.requestAnimationFrame(measure); });
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [onOverflow, panel]);

  return <Popover.Portal><Popover.Content ref={attachPanel} side="top" align="center" sideOffset={7} collisionPadding={12} onOpenAutoFocus={(event) => event.preventDefault()} onPointerDownOutside={onClose} onEscapeKeyDown={onClose} className="z-[80] max-h-[calc(100dvh-1.5rem)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-lg border border-[#d9d3c8] bg-white p-3.5 text-left shadow-[0_12px_35px_rgba(0,30,51,.16)] outline-none"><CalendarEventDetails block={block} closed={closed} locale={locale} copy={copy} /><Popover.Arrow className="fill-white" /></Popover.Content></Popover.Portal>;
}

function CalendarEventDetails({ block, closed, locale, copy }: { block: AvailabilityBlock; closed: boolean; locale: "en" | "th"; copy: (english: string, thai: string) => string }) {
  return <><p className={`font-mono text-[8px] font-semibold uppercase tracking-[.12em] ${closed ? "text-[#687170]" : "text-[#a34f32]"}`}>{closed ? copy("Closed", "ปิด") : copy("Booked", "จองแล้ว")}</p><SafeRichText value={block.name} className="mt-1.5 break-words text-[13px] font-semibold leading-[18px] text-[#001e33]" />{block.description ? <SafeRichText value={block.description} className="mt-2 break-words text-[11px] leading-5 text-[#526266]" /> : null}{closed ? <p className="mt-2.5 text-[11px] text-[#526266]">{formatClosedDates(block, locale)}</p> : <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] text-[#526266]"><dt className="text-[#7b8586]">{copy("Check-in", "เช็กอิน")}</dt><dd>{formatEventDate(block.startDate, locale)}</dd><dt className="text-[#7b8586]">{copy("Checkout", "เช็กเอาต์")}</dt><dd>{formatEventDate(block.endDate, locale)}</dd></dl>}{block.source === "google" ? <p className="mt-2 text-[9px] font-medium text-[#7b8586]">Google Calendar</p> : null}</>;
}

function Legend({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-1.5"><span className={`size-3 ${color}`} />{label}</span>; }
