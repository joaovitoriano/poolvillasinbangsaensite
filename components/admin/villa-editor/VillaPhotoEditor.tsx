"use client";

import { rectSortingStrategy } from "@dnd-kit/sortable";
import { Check, Copy, ImagePlus, Link2, Share2, Trash2, Undo2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AdminButton, AdminEmptyState, AdminField, AdminNotice, ConfirmDialog } from "../AdminUI";
import { AdminDragHandle, AdminSortableItem, AdminSortableList } from "../AdminSortable";
import { useAdminLocale } from "../AdminLocale";
import { useViewportEdgeAutoScroll } from "../useViewportEdgeAutoScroll";
import type { PhotoDraft } from "./model";
import { newKey } from "./model";

export function VillaPhotoEditor({ photos, onChange }: { photos: PhotoDraft[]; onChange: (photos: PhotoDraft[]) => void }) {
  const { copy } = useAdminLocale();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [removed, setRemoved] = useState<PhotoDraft[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState<Set<string> | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const selectionPointer = useRef<number | null>(null);
  const selectionIntent = useRef(true);

  function applySelectionAtPoint(position: { x: number; y: number }) {
    const target = document.elementFromPoint(position.x, position.y)?.closest<HTMLElement>("[data-photo-select-key]");
    const key = target?.dataset.photoSelectKey;
    if (key) updateSelection(key, selectionIntent.current);
  }
  const selectionAutoScroll = useViewportEdgeAutoScroll(applySelectionAtPoint);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const additions = Array.from(files).filter((file) => file.type.startsWith("image/")).map((file) => ({ key: newKey("photo"), file, url: URL.createObjectURL(file), thumbnailUrl: undefined }));
    onChange([...photos, ...additions]);
    if (fileInput.current) fileInput.current.value = "";
  }
  function removeKeys(keys: Set<string>) {
    const deleting = photos.filter((photo) => keys.has(photo.key));
    setRemoved(deleting);
    onChange(photos.filter((photo) => !keys.has(photo.key)));
    setSelected(new Set());
    setSelectMode(false);
  }
  function undoRemove() {
    onChange([...photos, ...removed]);
    setRemoved([]);
  }
  function confirmRemoval() {
    if (!pendingRemoval?.size) return;
    removeKeys(pendingRemoval);
    setPendingRemoval(null);
  }
  function addExternal() {
    const value = externalUrl.trim();
    try { new URL(value); } catch { return; }
    onChange([...photos, { key: newKey("photo-url"), externalUrl: value, url: value, thumbnailUrl: value }]);
    setExternalUrl("");
  }
  async function share(photo: PhotoDraft) {
    const nav = navigator as unknown as { share?: (data: ShareData) => Promise<void>; canShare?: (data?: ShareData) => boolean; clipboard: Clipboard };
    if (photo.file && nav.share && nav.canShare?.({ files: [photo.file] })) { await nav.share({ files: [photo.file], title: copy("Villa photo", "รูปภาพวิลล่า") }); return; }
    if (nav.share) { await nav.share({ url: photo.url, title: copy("Villa photo", "รูปภาพวิลล่า") }); return; }
    await nav.clipboard.writeText(photo.url);
  }

  function updateSelection(key: string, shouldSelect: boolean) {
    setSelected((current) => {
      if (current.has(key) === shouldSelect) return current;
      const next = new Set(current);
      if (shouldSelect) next.add(key); else next.delete(key);
      return next;
    });
  }
  function beginSelection(event: ReactPointerEvent<HTMLButtonElement>, key: string) {
    if (!selectMode || event.button !== 0) return;
    selectionPointer.current = event.pointerId;
    selectionIntent.current = !selected.has(key);
    updateSelection(key, selectionIntent.current);
    selectionAutoScroll.update({ x: event.clientX, y: event.clientY });
    event.currentTarget.closest<HTMLElement>("[data-photo-grid]")?.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function continueSelection(event: ReactPointerEvent<HTMLDivElement>) {
    if (selectionPointer.current !== event.pointerId) return;
    const position = { x: event.clientX, y: event.clientY };
    applySelectionAtPoint(position);
    selectionAutoScroll.update(position);
    event.preventDefault();
  }
  function endSelection(event: ReactPointerEvent<HTMLDivElement>) {
    if (selectionPointer.current !== event.pointerId) return;
    selectionPointer.current = null;
    selectionAutoScroll.stop();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function toggleSelectMode() {
    setSelectMode((current) => {
      if (current) setSelected(new Set());
      return !current;
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[#d5d8d4] bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-base font-semibold text-[#001e33]">{copy("Villa photos", "รูปภาพวิลล่า")}</h2><p className="mt-1 text-xs leading-5 text-[#68777a]">{copy("Select several images at once. The first image is the public cover; uploads and removals happen only when you save.", "เลือกหลายรูปพร้อมกันได้ รูปแรกคือภาพปกสาธารณะ การอัปโหลดและการลบจะเกิดขึ้นเมื่อคุณบันทึกเท่านั้น")}</p></div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} />
          <AdminButton variant="secondary" onClick={() => fileInput.current?.click()}><ImagePlus size={15} /> {copy("Add photos", "เพิ่มรูปภาพ")}</AdminButton>
          {photos.length ? <AdminButton variant={selectMode ? "primary" : "secondary"} aria-pressed={selectMode} onClick={toggleSelectMode}>{selectMode ? <Check size={15} /> : null}{selectMode ? copy("Done", "เสร็จสิ้น") : copy("Select", "เลือก")}</AdminButton> : null}
          {selectMode ? <AdminButton variant="secondary" onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((photo) => photo.key)))}>{selected.size === photos.length ? copy("Deselect all", "ยกเลิกการเลือกทั้งหมด") : copy("Select all", "เลือกทั้งหมด")}</AdminButton> : null}
          {selected.size ? <AdminButton variant="destructive" onClick={() => setPendingRemoval(new Set(selected))}><Trash2 size={15} /> {copy(`Remove ${selected.size}`, `ลบ ${selected.size} รูป`)}</AdminButton> : null}
        </div>
      </div>
      {removed.length ? <AdminNotice tone="info" title={copy(`${removed.length} photo${removed.length === 1 ? "" : "s"} pending removal`, `มี ${removed.length} รูปรอลบ`)}><button type="button" onClick={undoRemove} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><Undo2 size={13} /> {copy("Undo", "เลิกทำ")}</button></AdminNotice> : null}
      <div className="grid gap-3 rounded-xl border border-[#d5d8d4] bg-white p-4 sm:grid-cols-[1fr_auto]">
        <AdminField label={copy("Add an external image URL", "เพิ่ม URL รูปภาพภายนอก")} value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…" />
        <AdminButton variant="secondary" className="self-end" disabled={!externalUrl.trim()} onClick={addExternal}><Link2 size={15} /> {copy("Add URL", "เพิ่ม URL")}</AdminButton>
      </div>
      {!photos.length ? <AdminEmptyState title={copy("No photos yet", "ยังไม่มีรูปภาพ")} detail={copy("Add local files or an external image URL. Photos stay staged until you save the villa.", "เพิ่มไฟล์ในเครื่องหรือ URL รูปภาพภายนอก รูปภาพจะรอจนกว่าคุณจะบันทึกวิลล่า")} /> : (
        <AdminSortableList ids={photos.map((photo) => photo.key)} strategy={rectSortingStrategy} edgeAutoScroll onMove={(active, over) => {
          const from = photos.findIndex((item) => item.key === active), to = photos.findIndex((item) => item.key === over);
          if (from < 0 || to < 0 || from === to) return;
          const next = [...photos]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); onChange(next);
        }}><div data-photo-grid className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4" onPointerMove={continueSelection} onPointerUp={endSelection} onPointerCancel={endSelection}>
          {photos.map((photo, index) => {
            const isSelected = selected.has(photo.key);
            const photoContent = <>
              {photo.url ? <Image src={photo.thumbnailUrl || photo.url} alt="" fill unoptimized={Boolean(photo.file || photo.externalUrl)} sizes="(min-width:1024px) 240px, (min-width:640px) 33vw, 100vw" className="object-cover" /> : null}
              {index === 0 ? <span className="absolute left-2 top-2 rounded-md bg-[#001e33] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">{copy("Cover", "ภาพปก")}</span> : null}
              {photo.file ? <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#001e33]">{copy("Pending upload", "รออัปโหลด")}</span> : null}
              {selectMode ? <span className={`absolute right-2 top-2 grid size-6 place-items-center rounded-full border text-xs ${isSelected ? "border-[#0f6474] bg-[#0f6474] text-white" : "border-white/80 bg-black/25 text-white"}`}>{isSelected ? "✓" : ""}</span> : null}
            </>;
            return (
              <AdminSortableItem key={photo.key} id={photo.key} as="article" className={`group overflow-hidden rounded-xl border bg-white ${isSelected ? "border-[#0f6474] ring-2 ring-[#0f6474]/20" : "border-[#d5d8d4]"}`}>
                {selectMode ? <button type="button" data-photo-select-key={photo.key} aria-pressed={isSelected} onPointerDown={(event) => beginSelection(event, photo.key)} onClick={(event) => { if (event.detail === 0) updateSelection(photo.key, !isSelected); }} className="relative block aspect-square w-full touch-none overflow-hidden bg-[#e6e0d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c66f4e]" aria-label={copy(`${isSelected ? "Deselect" : "Select"} photo ${index + 1}`, `${isSelected ? "ยกเลิกการเลือก" : "เลือก"}รูปที่ ${index + 1}`)}>{photoContent}</button> : <div className="relative aspect-square w-full overflow-hidden bg-[#e6e0d5]">{photoContent}</div>}
                <div className="flex items-center justify-between gap-1 p-2">
                  <AdminDragHandle label={copy(`Reorder photo ${index + 1}`, `จัดลำดับรูปที่ ${index + 1}`)} />
                  <div className="flex gap-1"><button type="button" onClick={() => void share(photo)} className="grid size-11 place-items-center rounded-md text-[#0f6474] hover:bg-[#edf2f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]" aria-label={copy("Share or copy photo", "แชร์หรือคัดลอกรูปภาพ")}>{typeof navigator !== "undefined" && typeof (navigator as unknown as { share?: unknown }).share === "function" ? <Share2 size={14} /> : <Copy size={14} />}</button><button type="button" onClick={() => setPendingRemoval(new Set([photo.key]))} className="grid size-11 place-items-center rounded-md text-[#9a3f32] hover:bg-[#fff2ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]" aria-label={copy("Remove photo", "ลบรูปภาพ")}><Trash2 size={14} /></button></div>
                </div>
              </AdminSortableItem>
            );
          })}
        </div></AdminSortableList>
      )}
      <ConfirmDialog
        open={Boolean(pendingRemoval?.size)}
        onClose={() => setPendingRemoval(null)}
        onConfirm={confirmRemoval}
        title={pendingRemoval?.size === 1 ? copy("Remove this photo?", "ลบรูปภาพนี้หรือไม่") : copy(`Remove ${pendingRemoval?.size ?? 0} photos?`, `ลบรูปภาพ ${pendingRemoval?.size ?? 0} รูปหรือไม่`)}
        description={pendingRemoval?.size === 1 ? copy("The photo will be staged for removal and deleted when you save the villa.", "รูปภาพจะถูกรอการลบและจะถูกลบเมื่อคุณบันทึกวิลล่า") : copy("The selected photos will be staged for removal and deleted when you save the villa.", "รูปภาพที่เลือกจะถูกรอการลบและจะถูกลบเมื่อคุณบันทึกวิลล่า")}
        confirmLabel={pendingRemoval?.size === 1 ? copy("Remove photo", "ลบรูปภาพ") : copy("Remove photos", "ลบรูปภาพ")}
      />
    </section>
  );
}
