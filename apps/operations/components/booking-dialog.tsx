"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { CalendarPlus, Percent } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useLocale } from "@/components/locale-provider";
import { ClosedDateForm } from "./closed-date-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { resolvePricingPreset } from "@/convex/lib/pricing";
import { calculateCommission, type CommissionMode } from "@/convex/lib/commission";
import { formatThb } from "@/lib/format";

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type BookingDialogFormState = {
  checkIn: string;
  checkOut: string;
  discount: string;
  commission: string;
  commissionMode: CommissionMode;
};

type GuestFormState = {
  guestId?: Id<"guests">;
  name: string;
  phone: string;
  lineId: string;
};

type GuestSuggestion = {
  _id: Id<"guests">;
  name: string;
  phone: string;
  lineId?: string;
};

type BookingPreview = {
  nights: number;
  subtotalThb: number;
  discountThb: number;
  totalChargedThb: number;
  creatorCommissionThb: number;
  villaNetThb: number;
  isValid: boolean;
  validationError?: string;
};

function SummaryRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
      <dt className={emphasized ? "font-medium" : "text-muted-foreground"}>{label}</dt>
      <dd className={emphasized ? "whitespace-nowrap font-medium tabular-nums" : "whitespace-nowrap tabular-nums"}>{value}</dd>
    </div>
  );
}

function BookingSummary({
  preview,
  loading,
  validationMessage,
}: {
  preview: BookingPreview | undefined;
  loading: boolean;
  validationMessage?: string;
}) {
  const { locale, t } = useLocale();
  const titleId = useId();
  const money = (value: number) => formatThb(value, locale);
  const deduction = (value: number) => value === 0 ? money(0) : `− ${money(value)}`;

  return (
    <section aria-labelledby={titleId} className="rounded-lg border bg-muted/40 p-4 text-foreground">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 id={titleId} className="text-sm font-medium">{t({ en: "Booking summary", th: "สรุปการจอง" })}</h3>
        {preview ? <p className="whitespace-nowrap text-xs text-muted-foreground">{preview.nights} {t({ en: "nights", th: "คืน" })}</p> : null}
      </div>
      <div>
        {loading ? (
          <div className="space-y-2.5" role="status" aria-label={t({ en: "Calculating booking totals", th: "กำลังคำนวณยอดรวมการจอง" })}>
            {[0, 1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-4 w-full" />)}
          </div>
        ) : preview ? (
          <dl className="space-y-2 text-sm">
            <SummaryRow label={t({ en: "Original price", th: "ราคาเดิม" })} value={money(preview.subtotalThb)} />
            <SummaryRow label={t({ en: "Discount", th: "ส่วนลด" })} value={deduction(preview.discountThb)} />
            <Separator />
            <SummaryRow label={t({ en: "Booking total", th: "ยอดรวมการจอง" })} value={money(preview.totalChargedThb)} emphasized />
            <SummaryRow label={t({ en: "Commission", th: "ค่าคอมมิชชั่น" })} value={deduction(preview.creatorCommissionThb)} />
            <Separator />
            <SummaryRow label={t({ en: "Net revenue", th: "รายได้สุทธิ" })} value={money(preview.villaNetThb)} emphasized />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{validationMessage ?? t({ en: "Enter valid booking details to see the totals.", th: "กรอกข้อมูลการจองให้ถูกต้องเพื่อดูยอดรวม" })}</p>
        )}
        {preview?.validationError ? <p className="mt-3 text-sm text-destructive">{preview.validationError}</p> : null}
      </div>
    </section>
  );
}

export function BookingDialog({ villaId, bookingId, closedDateId, initialDate, open: controlledOpen, onOpenChange, trigger = true }: {
  villaId: Id<"villas">;
  bookingId?: Id<"bookings">;
  closedDateId?: Id<"closedDates">;
  initialDate?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
}) {
  const { t, localize } = useLocale();
  const createBooking = useMutation(api.bookings.create);
  const updateBooking = useMutation(api.bookings.update);
  const cancelBooking = useMutation(api.bookings.cancel);
  const booking = useQuery(api.bookings.get, bookingId ? { bookingId } : "skip");
  const closedDate = useQuery(api.closedDates.get, closedDateId ? { closedDateId } : "skip");
  const [entryMode, setEntryMode] = useState<"booking" | "closed">(closedDateId ? "closed" : "booking");
  const [closedDraft, setClosedDraft] = useState<{ from: string; to: string; notes: string } | null>(null);
  const bookingFormRef = useRef<HTMLFormElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const dangerTitleId = useId();
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [guest, setGuest] = useState<GuestFormState>({ name: "", phone: "", lineId: "" });
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const [activeGuestIndex, setActiveGuestIndex] = useState(0);
  const [form, setForm] = useState<BookingDialogFormState>({
    checkIn: todayKey(),
    checkOut: nextDate(todayKey()),
    discount: "0",
    commission: "0",
    commissionMode: "amount",
  });

  const initializedForm = useRef<string | null>(null);
  const preference = useQuery(api.commissionPreferences.get, { villaId });
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const user = useQuery(api.users.current, open && bookingId ? {} : "skip");
  const readOnly = Boolean(bookingId && booking && !booking.canEdit);
  const canCancel = Boolean(bookingId && booking?.status === "confirmed" && user &&
    (user.role === "admin" || booking.createdByUserId === user._id));
  const presets = useQuery(api.pricing.listForVilla, open ? { villaId } : "skip");
  const deferredGuestName = useDeferredValue(guest.name.trim());
  const guestSuggestions = useQuery(
    api.guests.search,
    open && !readOnly && showGuestSuggestions && deferredGuestName ? { name: deferredGuestName } : "skip",
  );
  const guestListId = useId();
  const hasGuestSuggestions = showGuestSuggestions && deferredGuestName === guest.name.trim() && Boolean(guestSuggestions?.length);
  useEffect(() => {
    if (!open) { initializedForm.current = null; setClosedDraft(null); setEntryMode(closedDateId ? "closed" : "booking"); return; }
    if ((bookingId ? !booking : preference === undefined) || (closedDateId && !closedDate)) return;
    const formKey = `${villaId}:${bookingId ?? closedDateId ?? "new"}:${initialDate ?? ""}`;
    if (initializedForm.current === formKey) return;
    initializedForm.current = formKey;
    const requestedCheckIn = initialDate && initialDate >= todayKey() ? initialDate : todayKey();
    const defaultCheckIn = booking?.checkIn ?? closedDate?.from ?? requestedCheckIn;
    const defaultCheckOut = booking?.checkOut ?? (closedDate ? nextDate(closedDate.to) : nextDate(defaultCheckIn));
    setError("");
    setConfirmCancelOpen(false);
    setCancelError("");
    setGuest({
      guestId: booking?.guestId,
      name: booking?.guestName ?? "",
      phone: booking?.guestPhone ?? "",
      lineId: booking?.guestLineId ?? "",
    });
    setNotes(booking?.notes ?? "");
    setShowGuestSuggestions(false);
    setActiveGuestIndex(0);
    setForm({
      checkIn: defaultCheckIn,
      checkOut: defaultCheckOut,
      discount: String(booking?.discountThb ?? 0),
      commission: String(booking ? booking.commissionValue : preference?.value ?? 0),
      commissionMode: booking ? booking.commissionMode : preference?.mode ?? "amount",
    });
  }, [booking, bookingId, closedDate, closedDateId, villaId, preference, initialDate, open]);

  function selectGuest(suggestion: GuestSuggestion) {
    setGuest({
      guestId: suggestion._id,
      name: suggestion.name,
      phone: suggestion.phone,
      lineId: suggestion.lineId ?? "",
    });
    setShowGuestSuggestions(false);
    setActiveGuestIndex(0);
  }

  function changeGuestName(name: string) {
    setGuest((current) => ({
      guestId: undefined,
      name,
      phone: current.guestId ? "" : current.phone,
      lineId: current.guestId ? "" : current.lineId,
    }));
    setShowGuestSuggestions(Boolean(name.trim()));
    setActiveGuestIndex(0);
  }

  function handleGuestNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!guestSuggestions?.length || !showGuestSuggestions) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveGuestIndex((current) => (current + 1) % guestSuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveGuestIndex((current) => (current - 1 + guestSuggestions.length) % guestSuggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectGuest(guestSuggestions[activeGuestIndex] ?? guestSuggestions[0]);
    } else if (event.key === "Escape") {
      setShowGuestSuggestions(false);
    }
  }

  const parsedDiscount = Number(form.discount);
  const parsedCommission = form.commission.trim() === "" ? 0 : Number(form.commission);
  const validDateRange = /^\d{4}-\d{2}-\d{2}$/.test(form.checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(form.checkOut) && form.checkOut > form.checkIn;
  const validDiscount = Number.isFinite(parsedDiscount) && parsedDiscount >= 0;
  const validCommission = Number.isFinite(parsedCommission) && parsedCommission >= 0 && (form.commissionMode === "amount" || parsedCommission <= 100);

  const validationMessage = !validDateRange
    ? t({ en: "Choose a check-out date after check-in.", th: "เลือกวันเช็กเอาต์ให้อยู่หลังวันเช็กอิน" })
    : !validDiscount
        ? t({ en: "Enter a discount of 0 or more.", th: "กรอกส่วนลดตั้งแต่ 0 บาทขึ้นไป" })
        : !validCommission
          ? t({ en: "Enter a valid commission (percentage must be 0–100).", th: "กรอกค่าคอมมิชชั่นให้ถูกต้อง (เปอร์เซ็นต์ต้องอยู่ระหว่าง 0–100)" })
          : undefined;
  const preview = useMemo<BookingPreview | undefined>(() => {
    if (readOnly && booking) return {
      nights: differenceInCalendarDays(parseISO(booking.checkOut), parseISO(booking.checkIn)),
      subtotalThb: booking.subtotalThb, discountThb: booking.discountThb,
      totalChargedThb: booking.totalChargedThb, creatorCommissionThb: booking.creatorCommissionThb,
      villaNetThb: booking.villaNetThb, isValid: true,
    };
    if (!open || validationMessage || !presets || (bookingId && !booking)) return undefined;
    const checkIn = parseISO(form.checkIn);
    const nightCount = differenceInCalendarDays(parseISO(form.checkOut), checkIn);
    if (nightCount > 90) {
      return {
        nights: nightCount,
        subtotalThb: 0,
        discountThb: parsedDiscount,
        totalChargedThb: 0,
        creatorCommissionThb: parsedCommission,
        villaNetThb: 0,
        isValid: false,
        validationError: t({ en: "A booking cannot exceed 90 nights.", th: "การจองต้องไม่เกิน 90 คืน" }),
      };
    }
    const dates = Array.from({ length: nightCount }, (_, index) => format(addDays(checkIn, index), "yyyy-MM-dd"));
    const nightlyPrices = dates.map((date) => resolvePricingPreset(presets, date).preset?.nightlyPriceThb);
    if (nightlyPrices.some((price) => price === undefined)) {
      return {
        nights: nightCount,
        subtotalThb: 0,
        discountThb: parsedDiscount,
        totalChargedThb: 0,
        creatorCommissionThb: parsedCommission,
        villaNetThb: 0,
        isValid: false,
        validationError: t({ en: "Set a default villa price before creating a booking.", th: "ตั้งราคาเริ่มต้นของวิลล่าก่อนสร้างการจอง" }),
      };
    }
    const subtotalThb = nightlyPrices.reduce<number>((total, price) => total + (price ?? 0), 0);
    const totalChargedThb = subtotalThb - parsedDiscount;
    const discountIsValid = totalChargedThb >= 0;
    const commissionThb = calculateCommission(totalChargedThb, form.commissionMode, parsedCommission);
    const commissionIsValid = commissionThb <= totalChargedThb;
    return {
      nights: nightCount,
      subtotalThb,
      discountThb: parsedDiscount,
      totalChargedThb,
      creatorCommissionThb: commissionThb,
      villaNetThb: discountIsValid && commissionIsValid ? totalChargedThb - commissionThb : 0,
      isValid: discountIsValid && commissionIsValid,
      validationError: !discountIsValid
        ? t({ en: "Discount cannot exceed the original price.", th: "ส่วนลดต้องไม่เกินราคาเดิม" })
        : !commissionIsValid
          ? t({ en: "Commission cannot exceed the booking total.", th: "ค่าคอมมิชชั่นต้องไม่เกินยอดรวมการจอง" })
          : undefined,
    };
  }, [readOnly, open, validationMessage, presets, bookingId, booking, form.checkIn, form.checkOut, parsedDiscount, parsedCommission, form.commissionMode, t]);
  const previewHasError = Boolean(preview && !preview.isValid);
  const isSubmitDisabled = !preview || previewHasError || !validDateRange || !validDiscount || !validCommission;
  const dirty = booking ? guest.name.trim() !== booking.guestName.trim() || guest.phone.trim() !== booking.guestPhone.trim() || guest.lineId.trim() !== (booking.guestLineId ?? "").trim() || form.checkIn !== booking.checkIn || form.checkOut !== booking.checkOut || Number(form.discount) !== booking.discountThb || Number(form.commission) !== booking.commissionValue || form.commissionMode !== booking.commissionMode || notes.trim() !== (booking.notes ?? "").trim() : Boolean(closedDateId) || Boolean(guest.name.trim());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || !dirty) return;
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const values = {
        guestId: guest.guestId,
        guestName: guest.name,
        guestPhone: guest.phone,
        guestLineId: guest.lineId || undefined,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        discountThb: parsedDiscount,
        commissionMode: form.commissionMode,
        commissionValue: parsedCommission,
        notes: String(data.get("notes")) || undefined,
      };
      if (bookingId) await updateBooking({ bookingId, ...values });
      else await createBooking({ villaId, closedDateId, ...values });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? localize(cause.message) : t({ en: "Could not create booking.", th: "ไม่สามารถสร้างการจองได้" }));
    } finally {
      setSaving(false);
    }
  }

  async function confirmCancellation() {
    if (!bookingId || !canCancel || cancelling || saving) return;
    setCancelling(true);
    setCancelError("");
    try {
      await cancelBooking({ bookingId });
      setConfirmCancelOpen(false);
      setOpen(false);
    } catch (cause) {
      setCancelError(cause instanceof Error ? localize(cause.message) : t({ en: "Could not cancel booking. Please try again.", th: "ไม่สามารถยกเลิกการจองได้ กรุณาลองอีกครั้ง" }));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!cancelling && !saving) setOpen(nextOpen); }}>
      {trigger && <DialogTrigger render={<Button />}><CalendarPlus />{t({ en: "New booking", th: "เพิ่มการจอง" })}</DialogTrigger>}
      <DialogContent className="" showCloseButton={!saving && !cancelling}>
        <DialogHeader className="flex-row items-center justify-start gap-2 pr-6">
          <DialogTitle className="text-xl font-semibold">{entryMode === "closed" ? t({ en: "Close Date", th: "ปิดวันที่" }) : t(bookingId ? (readOnly ? { en: "View booking", th: "ดูการจอง" } : { en: "Edit booking", th: "แก้ไขการจอง" }) : { en: "New booking", th: "เพิ่มการจอง" })}</DialogTitle>
          <Button type="button" variant="outline" size="sm" className="h-7 px-1.5 py-0 text-xs" disabled={readOnly || saving || cancelling || (closedDateId ? !closedDate?.canManage : false)} onClick={() => {
            if (entryMode === "booking" && !closedDraft) {
              const checkout = parseISO(form.checkOut);
              setClosedDraft({ from: form.checkIn, to: Number.isFinite(checkout.getTime()) && form.checkOut > form.checkIn ? format(addDays(checkout, -1), "yyyy-MM-dd") : form.checkIn, notes: bookingFormRef.current ? String(new FormData(bookingFormRef.current).get("notes") ?? "") : "" });
            }
            setEntryMode((mode) => mode === "booking" ? "closed" : "booking");
          }}>{entryMode === "booking" ? t({ en: "Close Date", th: "ปิดวันที่" }) : t({ en: "Booking", th: "การจอง" })}</Button>
        </DialogHeader>
        {open && (closedDateId || closedDraft) && (bookingId ? Boolean(booking) : closedDateId ? Boolean(closedDate) : true) && <ClosedDateForm key={`closed:${bookingId ?? closedDateId ?? initialDate ?? "new"}`} villaId={villaId} bookingId={bookingId} closedDateId={closedDateId} initialFrom={closedDate?.from ?? closedDraft?.from ?? todayKey()} initialTo={closedDate?.to ?? closedDraft?.to ?? todayKey()} initialNotes={closedDate?.notes ?? closedDraft?.notes} hidden={entryMode !== "closed"} canManage={closedDateId ? closedDate?.canManage : bookingId ? canCancel : true} onBusy={setSaving} onSaved={() => setOpen(false)} />}
        {(bookingId ? !booking : preference === undefined) ? <div role="status" aria-label={t({ en: "Loading booking", th: "กำลังโหลดการจอง" })}><Skeleton className="h-96 w-full" /></div> : (
        <form ref={bookingFormRef} key={`booking:${booking?._id ?? closedDateId ?? initialDate ?? "new"}`} onSubmit={submit} className={entryMode === "closed" ? "hidden" : "flex flex-col gap-4"}>
          <fieldset disabled={readOnly || saving} className="contents">

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid min-w-0 gap-1.5">
              <Label htmlFor="guest-name">{t({ en: "Guest name", th: "ชื่อผู้เข้าพัก" })}</Label>
              <div className="relative">
                <Input
                  id="guest-name"
                  name="guestName"
                  value={guest.name}
                  onChange={(event) => changeGuestName(event.target.value)}
                  onFocus={() => setShowGuestSuggestions(Boolean(guest.name.trim()) && !guest.guestId)}
                  onBlur={() => setShowGuestSuggestions(false)}
                  onKeyDown={handleGuestNameKeyDown}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={hasGuestSuggestions}
                  aria-controls={hasGuestSuggestions ? guestListId : undefined}
                  aria-activedescendant={hasGuestSuggestions ? `${guestListId}-${activeGuestIndex}` : undefined}
                  required
                  autoFocus
                  autoComplete="off"
                />
                {hasGuestSuggestions ? (
                  <div id={guestListId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    {guestSuggestions?.map((suggestion, index) => (
                      <button
                        key={suggestion._id}
                        id={`${guestListId}-${index}`}
                        type="button"
                        role="option"
                        aria-selected={index === activeGuestIndex}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectGuest(suggestion);
                        }}
                        onMouseEnter={() => setActiveGuestIndex(index)}
                        className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted aria-selected:bg-muted"
                      >
                        <span className="truncate font-medium">{suggestion.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{suggestion.phone || suggestion.lineId || "—"}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="guest-phone">{t({ en: "Phone", th: "โทรศัพท์" })}</Label>
              {booking?.contactsHidden ? <Input id="guest-phone" value="••••••••" readOnly /> : <PhoneInput id="guest-phone" value={guest.phone} onChange={(event) => setGuest((current) => ({ ...current, phone: event.target.value }))} autoComplete="off" />}
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="guest-line-id">{t({ en: "LINE ID", th: "ไอดีไลน์" })}</Label>
              <Input id="guest-line-id" value={guest.lineId} onChange={(event) => setGuest((current) => ({ ...current, lineId: event.target.value }))} autoCapitalize="none" autoComplete="off" />
            </div>
            <div className="col-span-2 grid min-w-0 grid-cols-2 items-end gap-0">
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="check-in">{t({ en: "Check-in", th: "เช็กอิน" })}</Label>
                <Input id="check-in" name="checkIn" type="date" value={form.checkIn} onChange={(event) => setForm((current) => ({ ...current, checkIn: event.target.value }))} className="rounded-tr-none rounded-br-none border-r-0" required />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="check-out">{t({ en: "Check-out", th: "เช็กเอาต์" })}</Label>
                <Input id="check-out" name="checkOut" type="date" value={form.checkOut} onChange={(event) => setForm((current) => ({ ...current, checkOut: event.target.value }))} className="rounded-tl-none rounded-bl-none border-l-0" required />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="discount">{t({ en: "Discount (฿)", th: "ส่วนลด (฿)" })}</Label>
              <Input
                id="discount"
                name="discount"
                type="number"
                min="0"
                value={form.discount}
                onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))}
              />
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="commission">{t(readOnly ? (form.commissionMode === "amount" ? { en: "Commission (฿)", th: "ค่าคอมมิชชัน (฿)" } : { en: "Commission (%)", th: "ค่าคอมมิชชัน (%)" }) : (form.commissionMode === "amount" ? { en: "Your commission (฿)", th: "ค่าคอมมิชชั่นของคุณ (฿)" } : { en: "Your commission (%)", th: "ค่าคอมมิชชั่นของคุณ (%)" }))}</Label>
              <div className="relative">
              <Input
                id="commission"
                name="commission"
                type="number"
                min="0"
                max={form.commissionMode === "percentage" ? 100 : undefined}
                step="0.01"
                className="pr-10"
                disabled={!bookingId && preference === undefined}
                value={form.commission}
                onChange={(event) => {
                  const commission = event.currentTarget.value;
                  setForm((current) => ({ ...current, commission }));
                }}
              />
              <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground" disabled={!bookingId && preference === undefined} onClick={() => setForm((current) => ({ ...current, commissionMode: current.commissionMode === "amount" ? "percentage" : "amount" }))} aria-label={t(form.commissionMode === "amount" ? { en: "Switch to percentage commission", th: "เปลี่ยนเป็นค่าคอมมิชชั่นแบบเปอร์เซ็นต์" } : { en: "Switch to fixed commission", th: "เปลี่ยนเป็นค่าคอมมิชชั่นแบบจำนวนเงิน" })}>
                {form.commissionMode === "amount" ? <span aria-hidden="true">฿</span> : <Percent className="size-4" />}
              </button>
              </div>
            </div>
            <div className="col-span-2 grid min-w-0 gap-1.5">
              <Label htmlFor="booking-notes">{t({ en: "Notes", th: "หมายเหตุ" })}</Label>
              <Textarea id="booking-notes" name="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>
          <BookingSummary
            preview={preview}
            loading={!readOnly && open && !validationMessage && presets === undefined}
            validationMessage={validationMessage}
          />
          {canCancel && (
            <section aria-labelledby={dangerTitleId} className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h3 id={dangerTitleId} className="text-sm font-medium text-destructive">{t({ en: "Danger zone", th: "โซนอันตราย" })}</h3>
              <Dialog open={confirmCancelOpen} onOpenChange={(nextOpen) => {
                if (!cancelling) {
                  setCancelError("");
                  setConfirmCancelOpen(nextOpen);
                }
              }}>
                <DialogTrigger render={<Button type="button" variant="destructive" disabled={saving || cancelling} />}>
                  {t({ en: "Cancel booking", th: "ยกเลิกการจอง" })}
                </DialogTrigger>
                <DialogContent role="alertdialog" showCloseButton={!cancelling}>
                  <DialogHeader>
                    <DialogTitle>{t({ en: "Are you sure?", th: "คุณแน่ใจหรือไม่?" })}</DialogTitle>
                    <DialogDescription>{t({ en: "Cancelling this booking will make its dates available again.", th: "เมื่อยกเลิกการจองนี้ วันที่เข้าพักจะกลับมาว่างอีกครั้ง" })}</DialogDescription>
                  </DialogHeader>
                  {cancelError && <p role="alert" className="text-sm text-destructive">{cancelError}</p>}
                  <DialogFooter>
                    <Button type="button" variant="outline" autoFocus disabled={cancelling} onClick={() => setConfirmCancelOpen(false)}>{t({ en: "No", th: "ไม่" })}</Button>
                    <Button type="button" variant="destructive" disabled={cancelling || !canCancel} onClick={confirmCancellation}>
                      {cancelling ? t({ en: "Cancelling…", th: "กำลังยกเลิก…" }) : t({ en: "Yes, cancel booking", th: "ใช่ ยกเลิกการจอง" })}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </section>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </fieldset>
          {!readOnly && <DialogFooter className="[&>button]:w-full">
            <Button type="submit" disabled={!dirty || saving || cancelling || isSubmitDisabled || (Boolean(bookingId) && !booking)}>
              {saving ? t({ en: "Saving…", th: "กำลังบันทึก…" }) : t(bookingId ? { en: "Save booking", th: "บันทึกการจอง" } : { en: "Create booking", th: "สร้างการจอง" })}
            </Button>
          </DialogFooter>}
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
