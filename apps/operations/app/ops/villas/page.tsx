"use client";

import { toast } from "sonner";

import { useMutation, useQuery } from "convex/react";
import { ArrowUpRight, Building2, UserRound, MessageCircle, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/convex/_generated/api";
import { PageFrame } from "@/components/page-frame";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useFormChanges } from "@/hooks/use-form-changes";
import { Label } from "@/components/ui/label";

function CopyVillaContact({ value, kind }: { value: string; kind: "phone" | "line" }) {
  const { t } = useLocale();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const Icon = kind === "phone" ? Phone : MessageCircle;
  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }
  return <button type="button" disabled={!value} onClick={copy} onBlur={() => setStatus("idle")} className="flex min-w-0 items-center gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-ring" aria-label={t(kind === "phone" ? { en: "Copy phone number", th: "คัดลอกเบอร์โทรศัพท์" } : { en: "Copy LINE ID", th: "คัดลอกไอดีไลน์" })}>
    <Icon aria-hidden="true" className="size-3.5 shrink-0" />
    <span className="truncate">{value || "—"}</span>
    <span aria-live="polite" className="text-xs">{status === "copied" ? t({ en: "Copied", th: "คัดลอกแล้ว" }) : status === "failed" ? t({ en: "Copy failed. Tap to retry", th: "คัดลอกไม่สำเร็จ แตะเพื่อลองอีกครั้ง" }) : ""}</span>
  </button>;
}

function CreateVillaDialog() {
  const changes = useFormChanges();
  const { t, localize } = useLocale();
  const createVilla = useMutation(api.villas.create);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!changes.dirty || saving) return; setSaving(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      await createVilla({
        name: String(data.get("name")),
        contactName: String(data.get("contactName")),
        contactLineId: String(data.get("contactLineId")),
        contactPhone: String(data.get("contactPhone")),
        defaultNightlyPriceThb: Number(data.get("price")),
      });
      toast.success(t({ en: `${String(data.get("name"))}: villa created.`, th: `${String(data.get("name"))}: สร้างวิลล่าแล้ว` }));
      setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? localize(cause.message) : t({ en: "Could not create villa.", th: "ไม่สามารถสร้างวิลล่าได้" })); }
    finally { setSaving(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}><Plus />{t({ en: "New villa", th: "เพิ่มวิลล่า" })}</DialogTrigger>
      <DialogContent className="">
        <form ref={changes.ref} onChange={changes.onChange} onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader><DialogTitle>{t({ en: "Create villa", th: "สร้างวิลล่า" })}</DialogTitle><DialogDescription>{t({ en: "Add the basic contact and starting nightly price.", th: "เพิ่มข้อมูลติดต่อพื้นฐานและราคาเริ่มต้นต่อคืน" })}</DialogDescription></DialogHeader>
          <div className="grid gap-3 min-[400px]:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="villa-name">{t({ en: "Villa name", th: "ชื่อวิลล่า" })}</Label><Input id="villa-name" name="name" required /></div>
            <div className="grid gap-1.5"><Label htmlFor="contact-name">{t({ en: "Owner name", th: "ชื่อเจ้าของ" })}</Label><Input id="contact-name" name="contactName" /></div>
            <div className="grid gap-1.5"><Label htmlFor="contact-phone">{t({ en: "Phone", th: "โทรศัพท์" })}</Label><PhoneInput id="contact-phone" name="contactPhone" /></div>
            <div className="grid gap-1.5"><Label htmlFor="contact-line-id">{t({ en: "LINE ID", th: "ไอดีไลน์" })}</Label><Input id="contact-line-id" name="contactLineId" autoCapitalize="none" /></div>
            <div className="grid gap-1.5"><Label htmlFor="starting-price">{t({ en: "Nightly price (฿)", th: "ราคาต่อคืน (฿)" })}</Label><Input id="starting-price" name="price" type="number" step="0.01" min="0" inputMode="decimal" required /></div>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter className="[&>button]:w-full"><Button type="submit" disabled={saving || !changes.dirty}>{saving ? t({ en: "Creating…", th: "กำลังสร้าง…" }) : t({ en: "Create villa", th: "สร้างวิลล่า" })}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function VillasPage() {
  const { t } = useLocale();
  const user = useQuery(api.users.current);
  const villas = useQuery(api.villas.listAccessible, {});
  return (
    <PageFrame title={{ en: "Villas", th: "วิลล่า" }} description={{ en: "Choose a villa to enter its calendar, bookings and financials.", th: "เลือกวิลล่าเพื่อดูปฏิทิน การจอง และการเงิน" }} action={user?.role === "admin" ? <CreateVillaDialog /> : undefined}>
      <div className="grid gap-4">
        {villas?.map((villa) => (
          <Card key={villa._id} className="transition-colors active:bg-muted/30">
            <CardHeader><CardTitle>{villa.name}</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground">
              <p className="flex min-w-0 items-center gap-2"><UserRound className="size-3.5 shrink-0" /><span className="truncate">{villa.contactName || t({ en: "No owner name", th: "ไม่มีชื่อเจ้าของ" })}</span></p>
              <CopyVillaContact value={villa.contactLineId} kind="line" />
              <CopyVillaContact value={villa.contactPhone} kind="phone" />
              <Button nativeButton={false} render={<Link href={`/ops/villas/${villa._id}/calendar`} />} variant="outline" className="mt-3 w-full justify-between">{t({ en: "Open villa", th: "เปิดวิลล่า" })}<ArrowUpRight /></Button>
            </CardContent>
          </Card>
        ))}
        {villas?.length === 0 && <div className="col-span-full rounded-xl border border-dashed bg-white py-16 text-center"><Building2 className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">{t({ en: "No villas available.", th: "ยังไม่มีวิลล่า" })}</p></div>}
      </div>
    </PageFrame>
  );
}
