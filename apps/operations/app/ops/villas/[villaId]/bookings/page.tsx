"use client";

import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, Pencil, Search } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BookingDialog } from "@/components/booking-dialog";
import { PageFrame } from "@/components/page-frame";
import { useLocale } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBookingSearch } from "@/lib/booking-search";
import { Skeleton } from "@/components/ui/skeleton";
import { currentYearRange, formatDate, formatThb } from "@/lib/format";

function CopyContact({ label, value }: { label: string; value?: string }) {
  const { t } = useLocale();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }
  return <button type="button" disabled={!value} onClick={copy} onBlur={() => setStatus("idle")} className="min-w-0 text-left" aria-label={t({ en: `Copy ${label}`, th: `คัดลอก${label}` })}>
    <span className="block text-[11px] text-muted-foreground" aria-live="polite">{status === "copied" ? t({ en: "Copied", th: "คัดลอกแล้ว" }) : status === "failed" ? t({ en: "Copy failed. Tap to retry", th: "คัดลอกไม่สำเร็จ แตะเพื่อลองอีกครั้ง" }) : label}</span>
    <span className="block truncate text-sm">{value || "—"}</span>
  </button>;
}

export default function VillaBookingsPage() { return <Suspense><BookingsContent /></Suspense>; }

function BookingsContent() {
  const searchParams = useSearchParams();
  const params = useParams<{ villaId: string }>();
  const villaId = params.villaId as Id<"villas">;
  const { locale, t, localize } = useLocale();
  const villa = useQuery(api.villas.get, { villaId });
  const user = useQuery(api.users.current);
  const range = currentYearRange();
  const bookings = useQuery(api.bookings.listForVilla, { villaId, ...range, limit: 500 });
  const [editingBookingId, setEditingBookingId] = useState<Id<"bookings"> | undefined>(() => (searchParams.get("bookingId") || undefined) as Id<"bookings"> | undefined);
  const [pagination, setPagination] = useState({ villaId, page: 1 });
  const [search, setSearch] = useState("");
  const searchBookings = useMemo(() => bookings ? createBookingSearch(bookings) : undefined, [bookings]);
  const filteredBookings = useMemo(() => searchBookings?.(search), [searchBookings, search]);
  const pageCount = Math.max(1, Math.ceil((filteredBookings?.length ?? 0) / 20));
  const page = Math.min(pagination.villaId === villaId ? pagination.page : 1, pageCount);
  const visibleBookings = filteredBookings?.slice((page - 1) * 20, page * 20);
  const firstPage = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index);
  function changePage(next: number) {
    setPagination({ villaId, page: Math.max(1, Math.min(next, pageCount)) });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  return (
    <PageFrame title={{ en: `${villa?.name ?? "Villa"} bookings`, th: `การจอง ${villa?.name ?? "วิลล่า"}` }} mobileTitle={{ en: "Bookings", th: "การจอง" }} description={{ en: "Confirmed and cancelled bookings for the current year.", th: "รายการจองที่ยืนยันและยกเลิกของปีปัจจุบัน" }} action={<BookingDialog villaId={villaId} />}>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPagination({ villaId, page: 1 }); }} placeholder={t({ en: "Search bookings…", th: "ค้นหาการจอง…" })} aria-label={t({ en: "Search by date, guest, phone, LINE ID or booked by", th: "ค้นหาด้วยวันที่ ผู้เข้าพัก เบอร์โทร ไอดีไลน์ หรือผู้ทำการจอง" })} />
      </div>
      <div className="grid gap-3">
        {!bookings ? <><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-44 rounded-xl" /></> : null}
        {visibleBookings?.map((booking) => {
          const canManage = booking.status === "confirmed" && (user?.role === "admin" || booking.createdByUserId === user?._id);
          return (
            <article key={booking._id} className="rounded-xl border bg-white p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate font-medium">{booking.guestName}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{formatDate(booking.checkIn, locale)} – {formatDate(booking.checkOut, locale)}</p></div>
                <Badge variant="secondary" className={booking.status === "confirmed" ? "shrink-0 bg-emerald-100 text-emerald-800" : "shrink-0 bg-rose-100 text-rose-800"}>{t(booking.status === "confirmed" ? { en: "Confirmed", th: "ยืนยันแล้ว" } : { en: "Cancelled", th: "ยกเลิกแล้ว" })}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3">
                <CopyContact label={t({ en: "Contact phone", th: "เบอร์โทรศัพท์ติดต่อ" })} value={booking.contactsHidden ? undefined : booking.guestPhone} />
                <CopyContact label={t({ en: "LINE ID", th: "ไอดีไลน์" })} value={booking.contactsHidden ? undefined : booking.guestLineId} />
                <div><p className="text-[11px] text-muted-foreground">{t({ en: "Booking total", th: "ยอดรวมการจอง" })}</p><p className="text-sm font-medium tabular-nums">{formatThb(booking.totalChargedThb, locale)}</p></div>
                <div className="min-w-0"><p className="text-[11px] text-muted-foreground">{t({ en: "Booked by", th: "จองโดย" })}</p><p className="truncate text-sm">{localize(booking.creatorName)}</p></div>
              </div>
              {<div className="mt-4 grid gap-2"><Button disabled={!canManage} variant="outline" onClick={() => setEditingBookingId(booking._id)}><Pencil />{t({ en: "Edit", th: "แก้ไข" })}</Button></div>}
            </article>
          );
        })}
        {filteredBookings?.length === 0 ? <div className="rounded-xl border border-dashed bg-white py-12 text-center text-sm text-muted-foreground">{t({ en: "No bookings found.", th: "ไม่พบการจอง" })}</div> : null}
      </div>
      {bookings && pageCount > 1 && <nav className="flex items-center justify-center gap-1.5" aria-label={t({ en: "Booking pages", th: "หน้ารายการจอง" })}>
        <Button type="button" variant="outline" size="icon-sm" className="size-8 rounded-sm" disabled={page === 1} onClick={() => changePage(page - 1)} aria-label={t({ en: "Previous page", th: "หน้าก่อนหน้า" })}><ChevronLeft /></Button>
        {pageNumbers.map((number) => <Button key={number} type="button" variant={number === page ? "default" : "outline"} size="icon-sm" className="size-8 rounded-sm text-xs" aria-current={number === page ? "page" : undefined} aria-label={t({ en: `Page ${number}`, th: `หน้า ${number}` })} onClick={() => changePage(number)}>{number}</Button>)}
        <Button type="button" variant="outline" size="icon-sm" className="size-8 rounded-sm" disabled={page === pageCount} onClick={() => changePage(page + 1)} aria-label={t({ en: "Next page", th: "หน้าถัดไป" })}><ChevronRight /></Button>
      </nav>}
      <BookingDialog villaId={villaId} bookingId={editingBookingId} open={Boolean(editingBookingId)} onOpenChange={(open) => { if (!open) setEditingBookingId(undefined); }} trigger={false} />
    </PageFrame>
  );
}
