"use client";

import { ConvexError } from "convex/values";
import { toast } from "sonner";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAction, useMutation, useQuery } from "convex/react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PageFrame } from "@/components/page-frame";
import { useLocale } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatThb } from "@/lib/format";
import { useFormChanges } from "@/hooks/use-form-changes";
import { cn } from "@/lib/utils";

function GeneralSettings({ villaId }: { villaId: Id<"villas"> }) {
  const { t } = useLocale();
  const villa = useQuery(api.villas.get, { villaId });
  const update = useMutation(api.villas.update);
  const changes = useFormChanges();
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!changes.dirty || busy) return; const form = event.currentTarget; const submitted = changes.capture(form); const data = new FormData(form);
    setBusy(true);
    try {
    await update({ villaId, name: String(data.get("name")), contactName: String(data.get("contactName")), contactLineId: String(data.get("contactLineId")), contactPhone: String(data.get("contactPhone")) });
    changes.saved(form, submitted);
    toast.success(t({ en: `${String(data.get("name"))}: villa settings saved.`, th: `${String(data.get("name"))}: บันทึกการตั้งค่าวิลล่าแล้ว` }));
    } finally { setBusy(false); }
  }
  if (!villa) return null;
  return (
    <section className="grid max-w-2xl gap-3">
      <form ref={changes.ref} onChange={changes.onChange} onSubmit={submit} className="grid items-start gap-4 [&>div>label]:mb-1.5 [&_input]:block">
        <div className="min-w-0"><Label htmlFor="settings-name">{t({ en: "Villa name", th: "ชื่อวิลล่า" })}</Label><Input id="settings-name" name="name" defaultValue={villa.name} required /></div>
        <div className="min-w-0"><Label htmlFor="settings-contact">{t({ en: "Owner name", th: "ชื่อเจ้าของ" })}</Label><Input id="settings-contact" name="contactName" defaultValue={villa.contactName} /></div>
        <div className="min-w-0"><Label htmlFor="settings-phone">{t({ en: "Phone", th: "โทรศัพท์" })}</Label><PhoneInput id="settings-phone" name="contactPhone" defaultValue={villa.contactPhone} /></div>
        <div className="min-w-0"><Label htmlFor="settings-line-id">{t({ en: "LINE ID", th: "ไอดีไลน์" })}</Label><Input id="settings-line-id" name="contactLineId" defaultValue={villa.contactLineId} autoCapitalize="none" /></div>
        <div className="flex items-end self-end"><Button type="submit" disabled={busy || !changes.dirty} className="w-full">{busy ? t({ en: "Saving…", th: "กำลังบันทึก…" }) : t({ en: "Save changes", th: "บันทึกการเปลี่ยนแปลง" })}</Button></div>
      </form>
    </section>
  );
}

type PricingPresetRowProps = {
  preset: Doc<"pricingPresets">;
  days: string[];
  locale: "en" | "th";
  onDelete: (preset: Doc<"pricingPresets">) => void;
};

function PricingPresetRow({ preset, days, locale, onDelete }: PricingPresetRowProps) {
  const { t } = useLocale();
  const presetName = preset.isDefault ? t({ en: "Default", th: "ค่าเริ่มต้น" }) : preset.name;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: preset._id, disabled: preset.isDefault });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-1.5 bg-background px-3 py-3 ", isDragging && "relative z-10 shadow-md ring-1 ring-foreground/10")}
    >
      {!preset.isDefault && (
        <button
          type="button"
          aria-label={t({ en: `Reorder ${presetName}`, th: `จัดลำดับ ${presetName}` })}
          className="flex size-10 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground transition-colors active:bg-muted"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{presetName}</p>
          {preset.isDefault && <Badge>{t({ en: "Default", th: "ค่าเริ่มต้น" })}</Badge>}
          {!preset.active && <Badge variant="outline">{t({ en: "Inactive", th: "ปิดใช้งาน" })}</Badge>}
        </div>
        <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{formatThb(preset.nightlyPriceThb, locale)} · {preset.dateFrom && preset.dateTo ? `${formatDate(preset.dateFrom, locale)} – ${formatDate(preset.dateTo, locale)}` : preset.daysOfWeek.map((day: number) => days[day]).join(" ")}</p>
      </div>
      {!preset.isDefault && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={t({ en: `Delete ${presetName}`, th: `ลบ ${presetName}` })}
          onClick={() => onDelete(preset)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

function PricingSettings({ villaId }: { villaId: Id<"villas"> }) {
  const changes = useFormChanges();
  const { locale, t, localize } = useLocale();
  const presets = useQuery(api.pricing.listForVilla, { villaId, includeInactive: true });
  const save = useMutation(api.pricing.save);
  const reorder = useMutation(api.pricing.reorder);
  const removePreset = useMutation(api.pricing.remove);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"days" | "dates">("days");
  const [saveError, setSaveError] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<Doc<"pricingPresets"> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [localOrder, setLocalOrder] = useState<Doc<"pricingPresets">[] | null>(null);
  const [reorderError, setReorderError] = useState(false);
  const orderedPresets = localOrder ?? presets ?? [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!changes.dirty) return; const form = event.currentTarget; const data = new FormData(form);
    setSavingPreset(true);
    setSaveError("");
    try {
      await save({ villaId, name: String(data.get("name")), nightlyPriceThb: Number(data.get("price")), daysOfWeek: scheduleMode === "days" ? data.getAll("days").map(Number) : [], dateFrom: scheduleMode === "dates" ? String(data.get("dateFrom")) : undefined, dateTo: scheduleMode === "dates" ? String(data.get("dateTo")) : undefined, isDefault: false });
      toast.success(t({ en: `${String(data.get("name"))}: pricing preset saved.`, th: `${String(data.get("name"))}: บันทึกชุดราคาแล้ว` }));
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? localize(error.message) : t({ en: "Could not save preset.", th: "ไม่สามารถบันทึกชุดราคาได้" }));
    } finally {
      setSavingPreset(false);
    }
  }
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const previous = orderedPresets;
    const oldIndex = previous.findIndex((preset) => preset._id === active.id);
    const newIndex = previous.findIndex((preset) => preset._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(previous, oldIndex, newIndex);
    const defaultPreset = next.find((preset) => preset.isDefault);
    const normalized = defaultPreset ? [...next.filter((preset) => !preset.isDefault), defaultPreset] : next;
    setLocalOrder(normalized);
    setReorderError(false);
    try {
      await reorder({ villaId, presetIds: normalized.map((preset) => preset._id) });
      toast.success(t({ en: "Pricing preset order saved.", th: "บันทึกลำดับชุดราคาแล้ว" }));
      setLocalOrder(null);
    } catch {
      setLocalOrder(null);
      setReorderError(true);
    }
  }
  async function confirmDelete() {
    if (!presetToDelete) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await removePreset({ presetId: presetToDelete._id });
      toast.success(t({ en: `${presetToDelete.name}: pricing preset deleted.`, th: `${presetToDelete.name}: ลบชุดราคาแล้ว` }));
      setLocalOrder(null);
      setPresetToDelete(null);
    } catch {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  }
  const days = locale === "th" ? ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <section className="grid gap-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">{t({ en: "Pricing presets", th: "ชุดราคา" })}</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}><Plus />{t({ en: "Add preset", th: "เพิ่มชุดราคา" })}</DialogTrigger>
          <DialogContent className="">
            <form ref={changes.ref} onChange={changes.onChange} onSubmit={submit} className="flex flex-col gap-4">
              <DialogHeader><DialogTitle>{t({ en: "Add preset", th: "เพิ่มชุดราคา" })}</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5"><Label htmlFor="preset-name">{t({ en: "Preset name", th: "ชื่อชุดราคา" })}</Label><Input id="preset-name" name="name" required /></div>
                <div className="grid gap-1.5"><Label htmlFor="preset-price">{t({ en: "Nightly price (฿)", th: "ราคาต่อคืน (฿)" })}</Label><Input id="preset-price" name="price" type="number" step="0.01" min="0" inputMode="decimal" required /></div>
                <Tabs value={scheduleMode} onValueChange={(value) => { if (value === "days" || value === "dates") { setScheduleMode(value); setSaveError(""); } }}>
                  <TabsList className="w-full">
                    <TabsTrigger value="days">{t({ en: "Days", th: "วัน" })}</TabsTrigger>
                    <TabsTrigger value="dates">{t({ en: "Dates", th: "วันที่" })}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="days">
                    <div className="flex flex-wrap justify-center gap-1">{days.map((day, index) => <label key={day} className="flex min-h-11 w-[calc((100%-0.75rem)/4)] cursor-pointer items-center justify-center gap-1 px-2 py-2 text-xs"><input type="checkbox" name="days" value={index} defaultChecked />{day}</label>)}</div>
                  </TabsContent>
                  <TabsContent value="dates">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid min-w-0 gap-1.5"><Label htmlFor="date-from">{t({ en: "From", th: "ตั้งแต่" })}</Label><Input id="date-from" name="dateFrom" type="date" required={scheduleMode === "dates"} /></div>
                      <div className="grid min-w-0 gap-1.5"><Label htmlFor="date-to">{t({ en: "To", th: "ถึง" })}</Label><Input id="date-to" name="dateTo" type="date" required={scheduleMode === "dates"} /></div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <p role="alert" className="text-sm text-destructive" hidden={!saveError}>{saveError}</p>
              <DialogFooter><Button className="w-full" type="submit" disabled={savingPreset || !changes.dirty}>{savingPreset ? t({ en: "Saving…", th: "กำลังบันทึก…" }) : t({ en: "Add preset", th: "เพิ่มชุดราคา" })}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedPresets.map((preset) => preset._id)} strategy={verticalListSortingStrategy}>
          <div className="divide-y overflow-hidden rounded-lg border">
            {orderedPresets.map((preset) => <PricingPresetRow key={preset._id} preset={preset} days={days} locale={locale} onDelete={(selectedPreset) => { setDeleteError(false); setPresetToDelete(selectedPreset); }} />)}
          </div>
        </SortableContext>
      </DndContext>
      {reorderError ? <p className="text-sm text-destructive" role="alert">{t({ en: "Could not save the preset order.", th: "ไม่สามารถบันทึกลำดับชุดราคาได้" })}</p> : null}

      <Dialog open={Boolean(presetToDelete)} onOpenChange={(open) => { if (!open && !deleting) { setDeleteError(false); setPresetToDelete(null); } }}>
        <DialogContent className="">
          <DialogHeader>
            <DialogTitle>{t({ en: "Delete preset?", th: "ลบชุดราคาหรือไม่" })}</DialogTitle>
          </DialogHeader>
          {deleteError ? <p className="text-sm text-destructive" role="alert">{t({ en: "Unable to delete the preset. Try again.", th: "ไม่สามารถลบชุดราคาได้ โปรดลองอีกครั้ง" })}</p> : null}
          <DialogFooter className="flex-row gap-2">
            <Button className="flex-1" type="button" variant="outline" disabled={deleting} onClick={() => { setDeleteError(false); setPresetToDelete(null); }}>{t({ en: "Cancel", th: "ยกเลิก" })}</Button>
            <Button className="flex-1" type="button" variant="destructive" disabled={deleting} onClick={confirmDelete}>{deleting ? t({ en: "Deleting…", th: "กำลังลบ…" }) : t({ en: "Delete", th: "ลบ" })}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TeamSettings({ villaId }: { villaId: Id<"villas"> }) {
  const user = useQuery(api.users.current);
  const draftKey = user ? `villa-invite-email:${user._id}:${villaId}` : "";
  const [emailDraft, setEmailDraft] = useState("");
  useEffect(() => {
    try { setEmailDraft(draftKey ? sessionStorage.getItem(draftKey) ?? "" : ""); } catch { setEmailDraft(""); }
  }, [draftKey]);
  function updateEmail(value: string) {
    setEmailDraft(value);
    try { if (draftKey) { if (value) sessionStorage.setItem(draftKey, value); else sessionStorage.removeItem(draftKey); } } catch { /* The in-memory draft still survives closing the dialog. */ }
  }
  const removeMember = useMutation(api.team.removeMember);
  const cancelInvitation = useAction(api.invitations.cancel);
  const [removal, setRemoval] = useState<{ kind: "member"; id: Id<"villaAssignments">; name: string } | { kind: "invitation"; id: Id<"villaInvitations">; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const { t } = useLocale();
  const team = useQuery(api.team.listForVilla, { villaId });
  const invite = useAction(api.invitations.send);
  const [role, setRole] = useState<"owner" | "agent">("agent");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const { localize } = useLocale();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailDraft.trim() || inviting) return;
    const form = event.currentTarget, data = new FormData(form), email = String(data.get("email"));
    setInviting(true); setInviteError("");
    try {
      const result = await invite({ villaId, email, role });
      toast.success(t(result.status === "added" ? { en: `${email}: villa access added.`, th: `${email}: เพิ่มสิทธิ์เข้าถึงวิลล่าแล้ว` } : { en: `Invitation sent to ${email}.`, th: `ส่งคำเชิญไปยัง ${email} แล้ว` }));
      updateEmail(""); setDialogOpen(false);
    } catch (error) {
      setInviteError(error instanceof ConvexError ? localize(String(error.data)) : t({ en: "Could not add this person. Please try again.", th: "ไม่สามารถเพิ่มบุคคลนี้ได้ กรุณาลองอีกครั้ง" }));
    } finally { setInviting(false); }
  }
  async function confirmRemoval() {
    if (!removal || removing) return;
    setRemoving(true); setRemoveError("");
    try {
      if (removal.kind === "member") await removeMember({ assignmentId: removal.id });
      else await cancelInvitation({ invitationId: removal.id });
      toast.success(t(removal.kind === "member" ? { en: `${removal.name}: removed from villa.`, th: `${removal.name}: ลบออกจากวิลล่าแล้ว` } : { en: `${removal.name}: invitation cancelled.`, th: `${removal.name}: ยกเลิกคำเชิญแล้ว` }));
      setRemoval(null);
    } catch (error) {
      setRemoveError(error instanceof ConvexError ? localize(String(error.data)) : t({ en: "Could not complete the request. Please try again.", th: "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง" }));
    } finally { setRemoving(false); }
  }
  return (
    <section className="grid gap-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">{t({ en: "Villa team", th: "ทีมวิลล่า" })}</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!inviting) { setDialogOpen(open); setInviteError(""); } }}>
          <DialogTrigger render={<Button size="sm" />}>{t({ en: "Invite", th: "เชิญ" })}</DialogTrigger>
          <DialogContent>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <DialogHeader><DialogTitle>{t({ en: "Invite to villa", th: "เชิญเข้าวิลล่า" })}</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5"><Label htmlFor="invite-email">{t({ en: "Email", th: "อีเมล" })}</Label><Input id="invite-email" name="email" type="email" required disabled={inviting} value={emailDraft} onChange={event => updateEmail(event.target.value)} /></div>
                <div className="grid gap-1.5"><Label>{t({ en: "Role", th: "บทบาท" })}</Label><Select disabled={inviting} value={role} onValueChange={(value) => setRole(value as "owner" | "agent")}><SelectTrigger className="w-full"><SelectValue>{t(role === "owner" ? { en: "Owner", th: "เจ้าของ" } : { en: "Agent", th: "เอเจนต์" })}</SelectValue></SelectTrigger><SelectContent><SelectItem value="owner">{t({ en: "Owner", th: "เจ้าของ" })}</SelectItem><SelectItem value="agent">{t({ en: "Agent", th: "เอเจนต์" })}</SelectItem></SelectContent></Select></div>
              </div>
              {inviteError && <p role="alert" className="text-sm text-destructive">{inviteError}</p>}
              <DialogFooter><Button className="w-full" type="submit" disabled={inviting || !emailDraft.trim()}>{inviting ? t({ en: "Adding…", th: "กำลังเพิ่ม…" }) : t({ en: "Send invitation", th: "ส่งคำเชิญ" })}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="divide-y overflow-hidden rounded-lg border">
        {team?.members.map((member) => (
          <div key={member._id} className="flex min-w-0 items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0"><p className="truncate font-medium">{member.user?.name ?? member.user?.email}</p><p className="truncate text-xs text-muted-foreground">{member.user?.email}</p>{member.user?.phone && <p className="text-xs text-muted-foreground">{member.user.phone}</p>}{member.user?.lineId && <p className="text-xs text-muted-foreground">{t({ en: "LINE ID", th: "ไลน์ไอดี" })}: {member.user.lineId}</p>}</div>
            <div className="flex shrink-0 items-center gap-1"><Badge className="shrink-0" variant="secondary">{t(member.role === "owner" ? { en: "Owner", th: "เจ้าของ" } : { en: "Agent", th: "เอเจนต์" })}</Badge><Button type="button" variant="ghost" size="icon-sm" aria-label={t({ en: `Remove ${member.user?.name ?? member.user?.email} from villa`, th: `ลบ ${member.user?.name ?? member.user?.email} ออกจากวิลล่า` })} onClick={() => { setRemoveError(""); setRemoval({ kind: "member", id: member._id, name: member.user?.name ?? member.user?.email ?? "" }); }}><Trash2 aria-hidden="true" /></Button></div>
          </div>
        ))}
        {team?.invitations.map((invitation) => (
          <div key={invitation._id} className="flex min-w-0 items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0"><p className="truncate font-medium">{invitation.email}</p><p className="truncate text-xs text-muted-foreground">{t(invitation.verifiedWorkosUserId ? { en: "Access ready on sign-in", th: "พร้อมเข้าใช้งานเมื่อเข้าสู่ระบบ" } : { en: "Invitation pending", th: "รอตอบรับคำเชิญ" })}</p></div>
            <div className="flex shrink-0 items-center gap-1"><Badge className="shrink-0" variant="outline">{t(invitation.role === "owner" ? { en: "Owner", th: "เจ้าของ" } : { en: "Agent", th: "เอเจนต์" })}</Badge><Button type="button" variant="ghost" size="icon-sm" aria-label={t({ en: `Cancel invitation for ${invitation.email}`, th: `ยกเลิกคำเชิญสำหรับ ${invitation.email}` })} onClick={() => { setRemoveError(""); setRemoval({ kind: "invitation", id: invitation._id, name: invitation.email }); }}><Trash2 aria-hidden="true" /></Button></div>
          </div>
        ))}
        {team?.members.length === 0 && team.invitations.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t({ en: "No team members yet.", th: "ยังไม่มีสมาชิกทีม" })}</p>}
      </div>
      <Dialog open={removal !== null} onOpenChange={open => { if (!open && !removing) setRemoval(null); }}>
        <DialogContent role="alertdialog" showCloseButton={!removing}>
          <DialogHeader><DialogTitle>{t({ en: "Are you sure?", th: "คุณแน่ใจหรือไม่?" })}</DialogTitle>
            <DialogDescription>{t(removal?.kind === "member" ? { en: `You want to remove ${removal.name}? Their data will still stay on this villa.`, th: `ต้องการลบ ${removal.name} หรือไม่? ข้อมูลของบุคคลนี้จะยังคงอยู่ในวิลล่านี้` } : { en: `Cancel the invitation for ${removal?.name ?? ""}? It will no longer grant access to this villa.`, th: `ยกเลิกคำเชิญสำหรับ ${removal?.name ?? ""} หรือไม่? คำเชิญนี้จะไม่ให้สิทธิ์เข้าถึงวิลล่านี้อีกต่อไป` })}</DialogDescription>
          </DialogHeader>
          {removeError && <p role="alert" className="text-sm text-destructive">{removeError}</p>}
          <DialogFooter><Button type="button" variant="outline" autoFocus disabled={removing} onClick={() => setRemoval(null)}>{t({ en: "Keep", th: "เก็บไว้" })}</Button><Button type="button" variant="destructive" disabled={removing} onClick={confirmRemoval}>{t(removing ? { en: "Removing…", th: "กำลังลบ…" } : removal?.kind === "member" ? { en: "Remove member", th: "ลบสมาชิก" } : { en: "Cancel invitation", th: "ยกเลิกคำเชิญ" })}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function VillaSettingsPage() { return <Suspense><SettingsContent /></Suspense>; }

function SettingsContent() {
  const searchParams = useSearchParams();
  const params = useParams<{ villaId: string }>(); const villaId = params.villaId as Id<"villas">;
  const { t } = useLocale(); const user = useQuery(api.users.current); const villa = useQuery(api.villas.get, { villaId });
  if (user && user.role !== "admin") return <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">{t({ en: "Villa settings are available to admins only.", th: "การตั้งค่าวิลล่าสำหรับผู้ดูแลเท่านั้น" })}</div>;
  return <PageFrame title={{ en: `${villa?.name ?? "Villa"} settings`, th: `การตั้งค่า ${villa?.name ?? "วิลล่า"}` }} mobileTitle={{ en: "Settings", th: "การตั้งค่า" }}><Tabs defaultValue={searchParams.get("tab") === "pricing" ? "pricing" : searchParams.get("tab") === "team" ? "team" : "general"}><TabsList className="grid h-auto w-full grid-cols-3"><TabsTrigger value="general">{t({ en: "General", th: "ทั่วไป" })}</TabsTrigger><TabsTrigger value="pricing">{t({ en: "Pricing", th: "ราคา" })}</TabsTrigger><TabsTrigger value="team">{t({ en: "Team", th: "ทีม" })}</TabsTrigger></TabsList><TabsContent value="general" className="pt-4"><GeneralSettings villaId={villaId} /></TabsContent><TabsContent value="pricing" className="pt-4"><PricingSettings villaId={villaId} /></TabsContent><TabsContent value="team" className="pt-4"><TeamSettings villaId={villaId} /></TabsContent></Tabs></PageFrame>;
}
