"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { compressVillaImage, createVillaThumbnail } from "@/lib/villa-image-processing";
import { useAdminLocale } from "./AdminLocale";
import { useAdminNavigationGuard } from "./AdminRouteShell";
import { AdminButton, AdminNotice, AdminSkeleton, AdminStatusBadge, AdminToast, ConfirmDialog } from "./AdminUI";
import { localizedInputValue } from "./localized-input";
import { DetailsSection, GuestExperienceSection, IntegrationsSection, LocationSection, PricingSection } from "./villa-editor/VillaEditorSections";
import { VillaPhotoEditor } from "./villa-editor/VillaPhotoEditor";
import { createBlankDraft, detailToDraft, draftFingerprint, villaSlugFromEnglish, type PhotoDraft, type VillaEditorDraft, type VillaEditorDetail } from "./villa-editor/model";

const tabs = [
  ["details", "Details"], ["location", "Location"], ["pricing", "Pricing"],
  ["photos", "Photos"], ["experience", "Guest experience"], ["integrations", "Integrations"],
] as const;
type TabId = (typeof tabs)[number][0];
type SavePhase = "idle" | "validating" | "compressing" | "uploading" | "committing" | "success" | "error";
type LifecycleStatus = "draft" | "published" | "archived";

function readableSaveError(reason: unknown, copy: (english: string, thai: string) => string) {
  if (!(reason instanceof Error)) return copy("The villa could not be saved. Your changes are still here.", "ไม่สามารถบันทึกวิลล่าได้ การเปลี่ยนแปลงของคุณยังคงอยู่");
  const message = reason.message.trim();
  const serverMessage = message.match(/Uncaught Error:\s*([\s\S]*?)(?:\s+Called by client|$)/)?.[1]?.trim();
  if (serverMessage) return serverMessage;
  if (!message.startsWith("[CONVEX")) return message;
  return copy("The villa could not be saved. Your changes are still here.", "ไม่สามารถบันทึกวิลล่าได้ การเปลี่ยนแปลงของคุณยังคงอยู่");
}

export function AdminVillaEditor({ villaId: rawVillaId }: { villaId?: string }) {
  return <VillaEditorWorkspace rawVillaId={rawVillaId} />;
}

function VillaEditorWorkspace({ rawVillaId }: { rawVillaId?: string }) {
  const { locale, copy } = useAdminLocale();
  const router = useRouter();
  const villaId = rawVillaId as Id<"villas"> | undefined;
  const detail = useQuery(api.villaEditor.get, villaId ? { villaId } : "skip") as VillaEditorDetail | null | undefined;
  const amenities = useQuery(api.adminVillas.listAmenities) ?? [];
  const houseRules = useQuery(api.adminVillas.listHouseRules) ?? [];
  const saveEditor = useMutation(api.villaEditor.saveVillaEditor);
  const generateUploadUrl = useMutation(api.adminVillas.generateUploadUrl);
  const cleanupUploads = useMutation(api.villaEditor.cleanupUncommittedPhotoUploads);
  const setStatus = useMutation(api.adminVillas.setStatus);
  const initial = useMemo(() => createBlankDraft(), []);
  const [baseline, setBaseline] = useState<VillaEditorDraft | null>(villaId ? null : initial);
  const [draft, setDraftState] = useState<VillaEditorDraft>(initial);
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<LifecycleStatus | null>(null);
  const [conflict, setConflict] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const currentDraft = useRef(draft);
  const suppressUnload = useRef(false);
  currentDraft.current = draft;

  const setDraft = useCallback((updater: (value: VillaEditorDraft) => VillaEditorDraft) => setDraftState(updater), []);
  const dirty = baseline !== null && draftFingerprint(draft) !== draftFingerprint(baseline);
  const saving = !["idle", "success", "error"].includes(phase);

  const applyDetail = useCallback((nextDetail: VillaEditorDetail) => {
    currentDraft.current.photos.forEach((photo) => {
      if (photo.file && photo.url.startsWith("blob:"))
        URL.revokeObjectURL(photo.url);
    });
    const next = detailToDraft(nextDetail);
    setDraftState(next);
    setBaseline(next);
    setLoadedUpdatedAt(nextDetail.updatedAt);
    setConflict(false);
    setError(null);
    setPhase("idle");
  }, []);

  useEffect(() => {
    if (!detail || detail.updatedAt === loadedUpdatedAt) return;
    if (loadedUpdatedAt !== undefined && (dirty || saving)) {
      setConflict(true);
      return;
    }
    applyDetail(detail);
  }, [applyDetail, detail, dirty, loadedUpdatedAt, saving]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (!dirty || suppressUnload.current) return; event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => () => {
    currentDraft.current.photos.forEach((photo) => { if (photo.file && photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url); });
  }, []);

  const canNavigate = useCallback(
    () => !dirty || window.confirm(copy("You have unsaved villa changes. Leave without saving them?", "คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการออกโดยไม่บันทึกหรือไม่")),
    [copy, dirty],
  );
  useAdminNavigationGuard(canNavigate);

  function navigate(href: string) {
    if (canNavigate()) router.push(href);
  }

  function discard() {
    if (!baseline) return;
    draft.photos.forEach((photo) => { if (photo.file && photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url); });
    setDraftState(baseline); setError(null); setPhase("idle");
  }

  async function upload(file: File) {
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    if (!response.ok) throw new Error(`Photo upload failed (${response.status})`);
    return (await response.json()).storageId as Id<"_storage">;
  }

  async function preparePhotos(photos: PhotoDraft[], uploadedIds: Id<"_storage">[]) {
    const next = [...photos];
    const jobs = photos.map((photo, index) => ({ photo, index })).filter((job) => job.photo.file);
    let cursor = 0; let finished = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        setPhase("compressing");
        const [full, thumb] = await Promise.all([compressVillaImage(job.photo.file!), createVillaThumbnail(job.photo.file!)]);
        setPhase("uploading");
        const uploadTracked = async (file: File) => { const storageId = await upload(file); uploadedIds.push(storageId); return storageId; };
        const uploads = await Promise.allSettled([uploadTracked(full), uploadTracked(thumb)]);
        const failedUpload = uploads.find((result) => result.status === "rejected");
        if (failedUpload?.status === "rejected") throw failedUpload.reason;
        const storageId = (uploads[0] as PromiseFulfilledResult<Id<"_storage">>).value;
        const thumbnailStorageId = (uploads[1] as PromiseFulfilledResult<Id<"_storage">>).value;
        next[job.index] = { ...job.photo, storageId, thumbnailStorageId };
        setProgress(++finished);
      }
    };
    const workers = await Promise.allSettled(Array.from({ length: Math.min(3, jobs.length) }, worker));
    const failedWorker = workers.find((result) => result.status === "rejected");
    if (failedWorker?.status === "rejected") throw failedWorker.reason;
    return next;
  }

  async function save() {
    setPhase("validating"); setError(null);
    if (!baseline) { setPhase("error"); return; }
    const uploadedIds: Id<"_storage">[] = [];
    try {
      setProgress(0);
      const nextDraft = { ...draft, villa: { ...draft.villa } };
      if (!villaId) nextDraft.villa.slug = villaSlugFromEnglish(nextDraft.villa.nameEn);
      const preparedPhotos = await preparePhotos(nextDraft.photos, uploadedIds);
      const preparedDraft = { ...nextDraft, photos: preparedPhotos };
      setPhase("committing");
      const villa = nextDraft.villa;
      const result = await saveEditor({
            villaId,
            expectedUpdatedAt: villaId ? loadedUpdatedAt : undefined,
            villa: {
              ...villa,
              formattedAddress: villa.formattedAddress.trim(), weekdayPriceThb: villa.weekdayPriceThb,
              weekendPriceThb: villa.weekendPriceThb || null, securityDepositThb: villa.securityDepositThb || null,
              googleCalendarId: villa.googleCalendarId.trim() || null,
            },
            amenityIds: nextDraft.amenityIds,
            rules: nextDraft.rules.map((rule) => ({ ruleId: rule.ruleId, clientKey: rule.key, textEn: rule.textEn, textTh: rule.textTh, icon: rule.icon || null })),
            sleeping: nextDraft.sleeping.map((room) => ({ sleepingId: room.sleepingId, clientKey: room.key, bedroomNumber: room.bedroomNumber, beds: room.beds })),
            photos: preparedPhotos.map((photo) => ({ photoId: photo.photoId, clientKey: photo.key, storageId: photo.storageId ?? null, thumbnailStorageId: photo.thumbnailStorageId ?? null, externalUrl: photo.externalUrl?.trim() || null })),
            rates: nextDraft.rates.map((rate) => ({ rateId: rate.rateId, clientKey: rate.key, labelEn: rate.labelEn, labelTh: rate.labelTh, startDate: rate.startDate, endDate: rate.endDate, nightlyPriceThb: rate.nightlyPriceThb })),
            customAmenities: nextDraft.customAmenities.map((item) => ({ clientKey: item.key, slug: item.slug, labelEn: item.labelEn, labelTh: item.labelTh, icon: item.icon || null })),
          });
      const savedDraft = preparedDraft;
      setDraftState(savedDraft); setBaseline(savedDraft); setPhase("success");
      if (!villaId) router.replace(`/admin/villas/${result.villaId}`);
    } catch (reason) {
      if (uploadedIds.length) { try { await cleanupUploads({ storageIds: uploadedIds }); } catch { /* keep original save error */ } }
      const message = readableSaveError(reason, copy);
      if (message.includes("updated by someone else")) setConflict(true);
      setError(message); setPhase("error");
    }
  }

  async function confirmLifecycle() {
    if (!villaId || !pendingStatus) return;
    setStatusBusy(true);
    try { await setStatus({ villaId, status: pendingStatus }); setPendingStatus(null); }
    catch (reason) { setError(reason instanceof Error && locale === "en" ? reason.message : copy("Status could not be changed.", "ไม่สามารถเปลี่ยนสถานะได้")); }
    finally { setStatusBusy(false); }
  }

  if (villaId && detail === undefined) return <AdminSkeleton rows={8} />;
  if (villaId && detail === null) return <AdminNotice tone="error" title={copy("Villa not found", "ไม่พบวิลล่า")}><AdminButton variant="secondary" className="mt-3" onClick={() => navigate("/admin/villas")}>{copy("Return to villas", "กลับไปหน้าวิลล่า")}</AdminButton></AdminNotice>;
  if (!baseline) return <AdminSkeleton rows={8} />;

  const status: LifecycleStatus = detail?.status ?? "draft";
  const localFiles = draft.photos.filter((photo) => photo.file).length;
  const villaName = localizedInputValue(locale, draft.villa.nameEn, draft.villa.nameTh) || draft.villa.nameEn || draft.villa.nameTh;
  const readiness = [villaName, draft.villa.bedrooms > 0, draft.villa.maxGuests > 0, draft.photos.length > 0];
  const readyCount = readiness.filter(Boolean).length;
  const phaseLabel = phase === "compressing" ? copy("Preparing photos…", "กำลังเตรียมรูปภาพ…") : phase === "uploading" ? copy(`Uploading photo ${progress + 1} of ${localFiles}`, `กำลังอัปโหลดรูป ${progress + 1} จาก ${localFiles}`) : phase === "committing" ? copy("Saving changes…", "กำลังบันทึกการเปลี่ยนแปลง…") : copy("Save changes", "บันทึกการเปลี่ยนแปลง");

  return <div className="min-w-0 pb-4">
    <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-[#dbe0db] bg-white p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div>{!villaId ? <button type="button" onClick={() => navigate("/admin/villas")} className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6474] hover:underline"><ArrowLeft size={14} /> {copy("Back to villas", "กลับไปหน้าวิลล่า")}</button> : null}<div className={!villaId ? "mt-3 flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-2"}><h2 className="font-serif text-2xl font-semibold text-[#001e33]">{villaId ? villaName || copy("Edit villa", "แก้ไขวิลล่า") : copy("Create a villa", "สร้างวิลล่า")}</h2><AdminStatusBadge tone={status === "published" ? "success" : status === "draft" ? "warning" : "neutral"}>{status === "published" ? copy("published", "เผยแพร่แล้ว") : status === "draft" ? copy("draft", "ฉบับร่าง") : copy("archived", "เก็บถาวร")}</AdminStatusBadge></div><p className="mt-1 text-xs text-[#68777a]">{copy(`${readyCount} of ${readiness.length} publishing essentials complete`, `ข้อมูลสำคัญพร้อมเผยแพร่ ${readyCount} จาก ${readiness.length} รายการ`)}</p></div>
      <div className="flex w-full flex-wrap gap-2 lg:w-auto">
        {villaId && draft.villa.slug ? <a href={`/${locale}/villas/${draft.villa.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cfc8bc] px-4 text-sm font-semibold text-[#001e33] lg:w-auto"><ExternalLink size={14} /> {copy("Public preview", "ดูตัวอย่างสาธารณะ")}</a> : null}
        {villaId && status !== "published" ? <AdminButton variant="secondary" disabled={dirty || saving} onClick={() => setPendingStatus("published")}>{copy("Publish", "เผยแพร่")}</AdminButton> : null}
      </div>
    </div>
    {error ? <AdminToast tone="error" title={copy("Changes not saved", "ยังไม่ได้บันทึกการเปลี่ยนแปลง")}>{error}</AdminToast> : null}
    {phase === "success" ? <AdminToast tone="success" title={copy("Villa saved", "บันทึกวิลล่าแล้ว")}>{copy("Your villa changes are saved.", "บันทึกการเปลี่ยนแปลงของวิลล่าแล้ว")}</AdminToast> : null}
    <div role="tablist" aria-label={copy("Villa editor sections", "ส่วนแก้ไขวิลล่า")} className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-[#dbe0db] bg-[#fbfaf6]/95 p-1 backdrop-blur md:sticky md:top-3 md:z-10 md:flex">
      {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`min-h-11 min-w-0 rounded-lg px-2 text-[11px] font-semibold leading-tight md:px-4 md:text-xs ${activeTab === id ? "bg-[#001e33] text-white" : "text-[#526266] hover:bg-white"}`}>{id === "details" ? copy(label, "รายละเอียด") : id === "location" ? copy(label, "ตำแหน่ง") : id === "pricing" ? copy(label, "ราคา") : id === "photos" ? copy(label, "รูปภาพ") : id === "experience" ? copy(label, "ประสบการณ์ผู้เข้าพัก") : copy(label, "การเชื่อมต่อ")}</button>)}
    </div>
    <fieldset className="min-w-0">
      <div role="tabpanel" className="min-w-0">
      {activeTab === "details" ? <div className="min-w-0 space-y-4">
        <DetailsSection draft={draft} setDraft={setDraft} />
        {villaId && status !== "archived" ? <section className="rounded-xl border border-[#deb4aa] bg-[#fffafa] p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[#923d32]">{copy("Danger zone", "โซนอันตราย")}</h3>
          <p className="mt-1 text-xs leading-5 text-[#7b5049]">{copy("These actions immediately change whether guests can find and book this villa.", "การดำเนินการเหล่านี้จะเปลี่ยนทันทีว่าผู้เข้าพักสามารถค้นหาและจองวิลล่านี้ได้หรือไม่")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {status === "published" ? <AdminButton variant="secondary" disabled={dirty || saving} onClick={() => setPendingStatus("draft")}>{copy("Return to draft", "กลับเป็นฉบับร่าง")}</AdminButton> : null}
            <AdminButton variant="destructive" disabled={dirty || saving} onClick={() => setPendingStatus("archived")}>{copy("Archive", "เก็บถาวร")}</AdminButton>
          </div>
        </section> : null}
      </div> : null}
      {activeTab === "location" ? <LocationSection draft={draft} setDraft={setDraft} /> : null}
      {activeTab === "pricing" ? <PricingSection draft={draft} setDraft={setDraft} /> : null}
      {activeTab === "photos" ? <VillaPhotoEditor photos={draft.photos} onChange={(photos) => setDraft((value) => ({ ...value, photos }))} /> : null}
      {activeTab === "experience" ? <GuestExperienceSection draft={draft} amenities={amenities} houseRules={houseRules} setDraft={setDraft} /> : null}
      {activeTab === "integrations" ? <IntegrationsSection draft={draft} setDraft={setDraft} /> : null}
    </div>
    </fieldset>
    {dirty || saving ? <div className="sticky bottom-3 z-20 mt-4 rounded-2xl border border-[#d5d8d4] bg-[#fbfaf6]/96 p-3 shadow-[0_8px_28px_rgba(0,30,51,.12)] backdrop-blur">
      <div className="flex items-center justify-between gap-3"><p className="hidden text-xs text-[#68777a] sm:block">{copy("Unsaved changes", "มีการเปลี่ยนแปลงที่ยังไม่บันทึก")}</p><div className="ml-auto flex gap-2"><AdminButton variant="secondary" disabled={saving} onClick={discard}>{copy("Discard changes", "ยกเลิกการเปลี่ยนแปลง")}</AdminButton><AdminButton busy={saving} busyLabel={phaseLabel} onClick={() => void save()}><Save size={15} /> {copy("Save changes", "บันทึกการเปลี่ยนแปลง")}</AdminButton></div></div>
    </div> : null}
    <ConfirmDialog open={pendingStatus !== null} onClose={() => setPendingStatus(null)} onConfirm={() => void confirmLifecycle()} title={pendingStatus === "published" ? copy("Publish this villa?", "เผยแพร่วิลล่านี้หรือไม่") : pendingStatus === "draft" ? copy("Return this villa to draft?", "นำวิลล่านี้กลับเป็นฉบับร่างหรือไม่") : copy("Archive this villa?", "เก็บวิลล่านี้ถาวรหรือไม่")} description={copy("This publication change is separate from villa content saving and will be recorded in the audit log.", "การเปลี่ยนสถานะการเผยแพร่นี้แยกจากการบันทึกเนื้อหาวิลล่าและจะถูกบันทึกในประวัติการใช้งาน")} confirmLabel={pendingStatus === "published" ? copy("Publish villa", "เผยแพร่วิลล่า") : pendingStatus === "draft" ? copy("Return to draft", "กลับเป็นฉบับร่าง") : copy("Archive villa", "เก็บวิลล่าถาวร")} tone={pendingStatus === "archived" ? "destructive" : "primary"} busy={statusBusy} />
    <ConfirmDialog open={conflict} onClose={() => setConflict(false)} onConfirm={() => { if (detail) applyDetail(detail); }} title={copy("A newer villa version is available", "มีข้อมูลวิลล่าเวอร์ชันใหม่กว่า")} description={copy("Another administrator saved this villa after you opened it. Load the latest version before editing again. Your current unsaved changes will be replaced.", "ผู้ดูแลคนอื่นบันทึกวิลล่านี้หลังจากคุณเปิดหน้า โปรดโหลดเวอร์ชันล่าสุดก่อนแก้ไขอีกครั้ง การเปลี่ยนแปลงที่ยังไม่บันทึกของคุณจะถูกแทนที่")} confirmLabel={copy("Load latest", "โหลดเวอร์ชันล่าสุด")} tone="primary" />
  </div>;
}
