"use client";

import { useMutation, useQuery } from "convex/react";
import { GripVertical, Plus, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AdminButton, AdminEmptyState, AdminSegmented, AdminSkeleton, AdminToast } from "./AdminUI";
import { AdminDragHandle, AdminSortableItem, AdminSortableList } from "./AdminSortable";
import { useAdminLocale } from "./AdminLocale";

type Lifecycle = "all" | "draft" | "published" | "archived";
type VillaStatus = Exclude<Lifecycle, "all">;
type Villa = Doc<"villas">;
type Copy = (english: string, thai: string) => string;

function visibleStatus(status: Villa["status"]): VillaStatus {
  return status;
}

function VillaListItem({
  villa,
  locale,
  copy,
  canReorder,
}: {
  villa: Villa;
  locale: "en" | "th";
  copy: Copy;
  canReorder: boolean;
}) {
  const villaName = locale === "th" ? villa.nameTh : villa.nameEn;

  return (
    <AdminSortableItem
      id={villa._id}
      as="article"
      disabled={!canReorder}
      className={(dragging) => `rounded-xl border border-[#e0e2de] bg-white p-3 transition sm:px-4 sm:py-3 ${dragging ? "border-[#0f6474]" : "hover:border-[#c8d1cd] hover:bg-[#fcfaf6]"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <AdminDragHandle disabled={!canReorder} label={copy(`Reorder ${villaName}`, `จัดลำดับ ${villaName}`)} />
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-5 text-[#062544] sm:text-base">{villaName}</h2>
        <Link href={`/admin/villas/${villa._id}?lang=${locale}`} onMouseDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()} className="ml-auto hidden min-h-11 min-w-32 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#001e33] bg-[#001e33] px-4 text-sm font-semibold text-white transition hover:bg-[#0f6474] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] focus-visible:ring-offset-2 sm:inline-flex">{copy("Edit villa", "แก้ไขวิลล่า")}</Link>
      </div>
      <Link href={`/admin/villas/${villa._id}?lang=${locale}`} onMouseDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()} className="mt-2.5 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-[#001e33] bg-[#001e33] px-4 text-sm font-semibold text-white transition hover:bg-[#0f6474] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] focus-visible:ring-offset-2 sm:hidden">{copy("Edit villa", "แก้ไขวิลล่า")}</Link>
    </AdminSortableItem>
  );
}

function VillaDragPreview({ villa, locale }: { villa: Villa; locale: "en" | "th" }) {
  return <article className="w-full rounded-xl border border-[#0f6474] bg-[#f2f8f5] p-3 shadow-lg ring-2 ring-[#0f6474]/15 sm:px-4 sm:py-3"><div className="flex min-w-0 items-center gap-2"><span className="grid size-11 shrink-0 place-items-center text-[#0f6474]"><GripVertical size={17} aria-hidden="true" /></span><h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-5 text-[#062544] sm:text-base">{locale === "th" ? villa.nameTh : villa.nameEn}</h2></div></article>;
}

export function AdminVillas() {
  const { locale, copy } = useAdminLocale();
  const villas = useQuery(api.adminVillas.list);
  const reorderVillas = useMutation(api.adminVillas.reorderVillas);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Lifecycle>("all");
  const [order, setOrder] = useState<Id<"villas">[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const canonicalOrder = useMemo(() => [...(villas ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map((villa) => villa._id), [villas]);

  useEffect(() => { if (!orderDirty) setOrder(canonicalOrder); }, [canonicalOrder, orderDirty]);

  const completeOrder = useMemo(() => {
    const valid = new Set(canonicalOrder);
    const current = order.filter((villaId) => valid.has(villaId));
    const included = new Set(current);
    return [...current, ...canonicalOrder.filter((villaId) => !included.has(villaId))];
  }, [canonicalOrder, order]);
  const villaById = useMemo(() => new Map((villas ?? []).map((villa) => [villa._id, villa])), [villas]);
  const orderedVillas = completeOrder.flatMap((villaId) => { const villa = villaById.get(villaId); return villa ? [villa] : []; });
  const visible = orderedVillas.filter((villa) => (filter === "all" || visibleStatus(villa.status) === filter) && (!search.trim() || `${villa.nameEn} ${villa.nameTh} ${villa.slug}`.toLowerCase().includes(search.trim().toLowerCase())));
  const canReorder = filter === "all" && !search.trim();
  const count = (status: VillaStatus) => villas?.filter((villa) => visibleStatus(villa.status) === status).length ?? 0;

  function moveVilla(villaId: Id<"villas">, targetIndex: number) {
    if (!canReorder) return;
    const sourceIndex = completeOrder.indexOf(villaId);
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= completeOrder.length || sourceIndex === targetIndex) return;
    const next = [...completeOrder];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrder(next);
    setOrderDirty(true);
  }

  async function saveOrder() {
    setOrderBusy(true);
    setFeedback(null);
    try {
      const result = await reorderVillas({ villaIds: completeOrder });
      setOrder(result.villaIds);
      setOrderDirty(false);
      setFeedback({ tone: "success", text: copy("Recommended villa order saved.", "บันทึกลำดับวิลล่าแนะนำแล้ว") });
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error && locale === "en" ? error.message : copy("Could not save the villa order", "ไม่สามารถบันทึกลำดับวิลล่าได้") });
    } finally {
      setOrderBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {feedback ? <AdminToast tone={feedback.tone}>{feedback.text}</AdminToast> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-end">
          <label className="w-full max-w-sm text-xs font-semibold text-[#405256]">{copy("Search villas", "ค้นหาวิลล่า")}<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy("Name or public slug", "ชื่อหรือ slug สาธารณะ")} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d5d8d4] bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]" /></label>
          <div className="hidden sm:block"><AdminSegmented label={copy("Villa lifecycle", "สถานะวิลล่า")} value={filter} onChange={setFilter} items={[{ value: "all", label: copy("All", "ทั้งหมด"), count: villas?.length ?? 0 }, { value: "published", label: copy("Published", "เผยแพร่แล้ว"), count: count("published") }, { value: "draft", label: copy("Draft", "ฉบับร่าง"), count: count("draft") }, { value: "archived", label: copy("Archived", "เก็บถาวร"), count: count("archived") }]} /></div>
          <label className="text-xs font-semibold text-[#405256] sm:hidden">{copy("Status", "สถานะ")}<select value={filter} onChange={(event) => setFilter(event.target.value as Lifecycle)} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d5d8d4] bg-white px-3 text-sm"><option value="all">{copy("All villas", "วิลล่าทั้งหมด")}</option><option value="published">{copy("Published", "เผยแพร่แล้ว")}</option><option value="draft">{copy("Draft", "ฉบับร่าง")}</option><option value="archived">{copy("Archived", "เก็บถาวร")}</option></select></label>
        </div>
        <Link href={`/admin/villas/new?lang=${locale}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#001e33] bg-[#001e33] px-4 text-sm font-semibold text-white hover:bg-[#0f6474] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]"><Plus size={16} /> {copy("Add villa", "เพิ่มวิลล่า")}</Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#001e33]">{copy("Recommended order", "ลำดับแนะนำ")}</p><p className="mt-0.5 text-xs text-[#68777a]">{copy("Drag villas into position. This affects only the public Recommended sort.", "ลากวิลล่าเพื่อจัดลำดับ การเปลี่ยนแปลงนี้มีผลเฉพาะการเรียงแบบแนะนำบนเว็บไซต์")}</p></div>{orderDirty ? <div className="flex gap-2"><AdminButton variant="secondary" disabled={orderBusy} onClick={() => { setOrder(canonicalOrder); setOrderDirty(false); }}>{copy("Discard", "ยกเลิกการเปลี่ยนแปลง")}</AdminButton><AdminButton busy={orderBusy} busyLabel={copy("Saving order…", "กำลังบันทึกลำดับ…")} onClick={() => void saveOrder()}><Save size={14} /> {copy("Save order", "บันทึกลำดับ")}</AdminButton></div> : null}</div>
      {!canReorder ? <p className="text-xs text-[#68777a]">{copy("Clear search and select All villas to change the Recommended order.", "ล้างการค้นหาและเลือกวิลล่าทั้งหมดเพื่อเปลี่ยนลำดับแนะนำ")}</p> : null}

      <section>
        {villas === undefined ? <div className="overflow-hidden rounded-2xl border border-[#e0e2de] bg-white"><AdminSkeleton rows={4} /></div> : villas.length === 0 ? <div className="overflow-hidden rounded-2xl border border-[#e0e2de] bg-white"><AdminEmptyState title={copy("No villas yet", "ยังไม่มีวิลล่า")} detail={copy("Add the first villa to create its permanent website page.", "เพิ่มวิลล่าแรกเพื่อสร้างหน้าเว็บไซต์ถาวร")} action={<Link href={`/admin/villas/new?lang=${locale}`} className="inline-flex min-h-11 items-center rounded-xl bg-[#001e33] px-4 text-sm font-semibold text-white">{copy("Add villa", "เพิ่มวิลล่า")}</Link>} /></div> : visible.length === 0 ? <div className="overflow-hidden rounded-2xl border border-[#e0e2de] bg-white"><AdminEmptyState title={copy("No matching villas", "ไม่พบวิลล่าที่ตรงกัน")} detail={copy("Try another name, slug, or lifecycle state.", "ลองค้นหาชื่อ slug หรือสถานะอื่น")} action={<AdminButton variant="secondary" onClick={() => { setSearch(""); setFilter("all"); }}>{copy("Reset filters", "รีเซ็ตตัวกรอง")}</AdminButton>} /></div> : (
          <AdminSortableList ids={visible.map((villa) => villa._id)} onMove={(active, over) => moveVilla(active as Id<"villas">, completeOrder.indexOf(over as Id<"villas">))} renderOverlay={(active) => { const villa = villaById.get(active as Id<"villas">); return villa ? <VillaDragPreview villa={villa} locale={locale} /> : null; }}>
            <div className="space-y-3">
              {visible.map((villa) => <VillaListItem key={villa._id} villa={villa} locale={locale} copy={copy} canReorder={canReorder} />)}
            </div>
          </AdminSortableList>
        )}
      </section>
    </div>
  );
}
