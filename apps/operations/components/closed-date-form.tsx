"use client";

import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useLocale } from "./locale-provider";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

export function ClosedDateForm({ villaId, bookingId, closedDateId, initialFrom, initialTo, initialNotes, hidden, canManage = true, onSaved, onBusy }: {
  villaId: Id<"villas">; bookingId?: Id<"bookings">; closedDateId?: Id<"closedDates">;
  initialFrom: string; initialTo: string; initialNotes?: string; hidden: boolean; canManage?: boolean;
  onSaved: () => void; onBusy: (busy: boolean) => void;
}) {
  const { locale, t, localize } = useLocale();
  const save = useMutation(api.closedDates.save);
  const cancel = useMutation(api.closedDates.cancel);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [confirmation, setConfirmation] = useState<"save" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = !closedDateId || from !== initialFrom || to !== initialTo || notes.trim() !== (initialNotes ?? "").trim();
  async function persist(action: "save" | "cancel") {
    if (busy || !canManage || (action === "save" && !dirty)) return;
    setBusy(true); onBusy(true); setError("");
    try {
      if (action === "cancel" && closedDateId) await cancel({ closedDateId });
      else await save({ villaId, bookingId, closedDateId, from, to, notes, confirmCancellation: Boolean(bookingId && confirmation === "save") });
      const dates = `${formatDate(action === "cancel" ? initialFrom : from, locale)} – ${formatDate(action === "cancel" ? initialTo : to, locale)}`;
      toast.success(t(action === "cancel"
        ? { en: `${dates}: closed date cancelled.`, th: `${dates}: ยกเลิกวันที่ปิดแล้ว` }
        : closedDateId
          ? { en: `${dates}: closed date successfully updated.`, th: `${dates}: อัปเดตวันที่ปิดสำเร็จแล้ว` }
          : { en: `${dates}: closed date successfully created.`, th: `${dates}: สร้างวันที่ปิดสำเร็จแล้ว` }));
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? localize(cause.message) : t({ en: "Could not save closed date.", th: "ไม่สามารถบันทึกวันที่ปิดได้" }));
    } finally { setBusy(false); onBusy(false); setConfirmation(null); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || busy || !canManage) return;
    if (bookingId) setConfirmation("save");
    else void persist("save");
  }
  return <form onSubmit={submit} className={hidden ? "hidden" : "flex flex-col gap-4"}>
    <fieldset disabled={busy || !canManage} className="grid grid-cols-2 gap-3">
      <div className="grid min-w-0 gap-1.5"><Label htmlFor="closed-from">{t({ en: "From", th: "ตั้งแต่" })}</Label><Input id="closed-from" type="date" required value={from} onChange={(event) => setFrom(event.target.value)} /></div>
      <div className="grid min-w-0 gap-1.5"><Label htmlFor="closed-to">{t({ en: "To", th: "ถึง" })}</Label><Input id="closed-to" type="date" required min={from} value={to} onChange={(event) => setTo(event.target.value)} /></div>
      <div className="col-span-2 grid gap-1.5"><Label htmlFor="closed-notes">{t({ en: "Notes", th: "หมายเหตุ" })}</Label><Textarea id="closed-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></div>
    </fieldset>
    {closedDateId && canManage && <section className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <h3 className="text-sm font-medium text-destructive">{t({ en: "Danger zone", th: "โซนอันตราย" })}</h3>
      <Button type="button" variant="destructive" disabled={busy} onClick={() => setConfirmation("cancel")}>{t({ en: "Cancel closed date", th: "ยกเลิกวันที่ปิด" })}</Button>
    </section>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <DialogFooter><Button type="submit" className="w-full" disabled={busy || !canManage || !dirty}>{busy ? t({ en: "Saving…", th: "กำลังบันทึก…" }) : t({ en: "Save Closed date", th: "บันทึกวันที่ปิด" })}</Button></DialogFooter>
    <Dialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !busy) setConfirmation(null); }}>
      <DialogContent role="alertdialog" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{t({ en: "Are you sure?", th: "คุณแน่ใจหรือไม่?" })}</DialogTitle>
          <DialogDescription>{confirmation === "save" ? t({ en: "This date has an active booking. Closing the date will automatically cancel the booking", th: "วันที่นี้มีการจองอยู่ การปิดวันที่จะยกเลิกการจองโดยอัตโนมัติ" }) : t({ en: "These dates will become available for booking again.", th: "วันที่เหล่านี้จะเปิดให้จองได้อีกครั้ง" })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" autoFocus disabled={busy} onClick={() => setConfirmation(null)}>{t({ en: "No", th: "ไม่" })}</Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => { if (confirmation) void persist(confirmation); }}>{confirmation === "save" ? t({ en: "Yes, close date", th: "ใช่ ปิดวันที่" }) : t({ en: "Yes, cancel closed date", th: "ใช่ ยกเลิกวันที่ปิด" })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </form>;
}
