"use client";

import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import { useLocale } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/page-frame";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormChanges } from "@/hooks/use-form-changes";
import { signOutAction } from "@/app/ops/actions";

export default function PersonalSettingsPage() {
  const { t, localize } = useLocale();
  const user = useQuery(api.users.current);
  const changes = useFormChanges();
  const save = useMutation(api.users.updateProfile);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!changes.dirty || busy) return; const form = event.currentTarget; const submitted = changes.capture(form); const data = new FormData(event.currentTarget); setBusy(true); setMessage("");
    try { await save({ name: String(data.get("name")), phone: String(data.get("phone")), lineId: String(data.get("lineId")) }); changes.saved(form, submitted); toast.success(t({ en: "Account details saved.", th: "บันทึกข้อมูลบัญชีแล้ว" })); }
    catch (error) { setMessage(error instanceof Error ? localize(error.message) : t({ en: "Could not save.", th: "ไม่สามารถบันทึกได้" })); }
    finally { setBusy(false); }
  }
  return <PageFrame title={{ en: "Settings", th: "การตั้งค่า" }}><div className="flex min-h-[calc(100dvh-10.75rem-env(safe-area-inset-bottom))] flex-col gap-6">
    <h1 className="text-lg font-semibold">{t({ en: "Your account details", th: "ข้อมูลบัญชีของคุณ" })}</h1>
    {!user && <Skeleton className="h-64" />}
    {user && <form ref={changes.ref} onChange={changes.onChange} key={user._id} onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5"><Label htmlFor="profile-name">{t({ en: "Name", th: "ชื่อ" })}</Label><Input id="profile-name" name="name" defaultValue={user.name} required /></div>
      <div className="grid gap-1.5"><Label htmlFor="profile-phone">{t({ en: "Phone (optional)", th: "โทรศัพท์ (ไม่บังคับ)" })}</Label><PhoneInput id="profile-phone" name="phone" defaultValue={user.phone} /></div>
      <div className="grid gap-1.5"><Label htmlFor="profile-line">{t({ en: "LINE ID (optional)", th: "ไอดีไลน์ (ไม่บังคับ)" })}</Label><Input id="profile-line" name="lineId" defaultValue={user.lineId} /></div>
      <Button disabled={busy || !changes.dirty} type="submit">{busy ? t({ en: "Saving…", th: "กำลังบันทึก…" }) : t({ en: "Save changes", th: "บันทึกการเปลี่ยนแปลง" })}</Button>
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    </form>}
    <form action={signOutAction} className="mt-auto pt-6"><Button className="w-full" variant="outline" type="submit">{t({ en: "Sign out", th: "ออกจากระบบ" })}</Button></form>
  </div></PageFrame>;
}
