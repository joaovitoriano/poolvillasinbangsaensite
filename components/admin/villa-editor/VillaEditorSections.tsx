"use client";

import { CalendarRange, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AMENITY_ICON_OPTIONS, AmenityIcon, PREMADE_AMENITIES } from "@/lib/amenities";
import { HOUSE_RULE_ICON_OPTIONS, HOUSE_RULE_PRESETS, HouseRuleIcon } from "@/lib/house-rules";
import { AdminButton, AdminField, AdminNotice, AdminSelect, AdminTextarea } from "../AdminUI";
import { AdminDragHandle, AdminSortableItem, AdminSortableList } from "../AdminSortable";
import { useAdminLocale } from "../AdminLocale";
import { translatedInputPatch, translatedInputValue } from "../translated-input";
import { VillaLocationPicker } from "../VillaLocationPicker";
import type { CustomAmenityDraft, RateDraft, RuleDraft, SleepingDraft, VillaDetailsDraft, VillaEditorDraft } from "./model";
import { newKey, normalizeSleepingRooms } from "./model";

type SetDraft = (updater: (draft: VillaEditorDraft) => VillaEditorDraft) => void;
const section = "min-w-0 rounded-xl border border-[#d5d8d4] bg-white p-4 sm:p-5";
export function DetailsSection({ draft, setDraft }: { draft: VillaEditorDraft; setDraft: SetDraft }) {
  const { locale, copy } = useAdminLocale();
  const update = <K extends keyof VillaDetailsDraft>(key: K, value: VillaDetailsDraft[K]) => setDraft((current) => ({ ...current, villa: { ...current.villa, [key]: value } }));
  const updateBedrooms = (bedrooms: number) => setDraft((current) => ({ ...current, villa: { ...current.villa, bedrooms }, sleeping: normalizeSleepingRooms(current.sleeping, bedrooms) }));
  return <div className="min-w-0 space-y-4">
    <section className={`${section} grid gap-4`}><SectionTitle title={copy("Identity", "ข้อมูลระบุตัวตน")} detail={copy("Enter the public name in English or Thai. Its translation and permanent English URL are created when you first save the villa.", "กรอกชื่อสาธารณะเป็นภาษาอังกฤษหรือไทย ระบบจะสร้างคำแปลและ URL ภาษาอังกฤษแบบถาวรเมื่อบันทึกวิลล่าครั้งแรก")} className="" />
      <AdminField label={copy("Villa name", "ชื่อวิลล่า")} value={translatedInputValue(locale, draft.villa.nameEn, draft.villa.nameTh)} sourceText={draft.villa.nameSource} onChange={(e) => setDraft((current) => ({ ...current, villa: { ...current.villa, ...translatedInputPatch(locale, "nameSource", "nameEn", "nameTh", e.target.value) } }))} />
      <div className="grid gap-4 border-t border-[#eee8de] pt-4"><SectionTitle title={copy("Description", "คำอธิบาย")} detail={copy("Enter the description in English or Thai, then set the standard arrival and departure times.", "กรอกคำอธิบายเป็นภาษาอังกฤษหรือไทย จากนั้นกำหนดเวลาเข้าพักและออกจากที่พักมาตรฐาน")} className="" />
        <AdminTextarea label={copy("Description", "คำอธิบาย")} value={translatedInputValue(locale, draft.villa.descriptionEn, draft.villa.descriptionTh)} sourceText={draft.villa.descriptionSource} onChange={(e) => setDraft((current) => ({ ...current, villa: { ...current.villa, ...translatedInputPatch(locale, "descriptionSource", "descriptionEn", "descriptionTh", e.target.value) } }))} rows={7} />
        <div className="border-t border-[#eee8de] pt-4"><h3 className="text-sm font-semibold text-[#001e33]">{copy("Check-in and check-out", "เช็กอินและเช็กเอาต์")}</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><AdminField label={copy("Check-in time", "เวลาเช็กอิน")} type="time" value={draft.villa.checkInTime} onChange={(e) => update("checkInTime", e.target.value)} /><AdminField label={copy("Check-out time", "เวลาเช็กเอาต์")} type="time" value={draft.villa.checkOutTime} onChange={(e) => update("checkOutTime", e.target.value)} /></div></div>
      </div>
    </section>
    <section className={`${section} grid gap-4 sm:grid-cols-2 lg:grid-cols-4`}><SectionTitle title={copy("Capacity and beds", "จำนวนรองรับและเตียง")} detail={copy("Set the villa capacity, then describe the beds available in each bedroom.", "กำหนดจำนวนผู้เข้าพัก จากนั้นระบุเตียงในแต่ละห้องนอน")} className="sm:col-span-2 lg:col-span-4" />
      <CapacitySelect label={copy("Bedrooms", "ห้องนอน")} value={draft.villa.bedrooms} min={0} max={20} onChange={updateBedrooms} />
      <CapacitySelect label={copy("Bathrooms", "ห้องน้ำ")} value={draft.villa.bathrooms} min={0} max={20} onChange={(v) => update("bathrooms", v)} />
      <CapacitySelect label={copy("Parking spaces", "ที่จอดรถ")} value={draft.villa.parkingSpaces} min={0} max={20} onChange={(v) => update("parkingSpaces", v)} />
      <CapacitySelect label={copy("Maximum people", "จำนวนผู้เข้าพักสูงสุด")} value={draft.villa.maxGuests} min={0} max={40} onChange={(v) => update("maxGuests", v)} />
      <SleepingEditor className="sm:col-span-2 lg:col-span-4" rooms={draft.sleeping} onChange={(sleeping) => setDraft((current) => ({ ...current, sleeping }))} />
    </section>
  </div>;
}

export function LocationSection({ draft, setDraft }: { draft: VillaEditorDraft; setDraft: SetDraft }) {
  const { copy } = useAdminLocale();
  return <section className={section}><SectionTitle title={copy("Google location", "ตำแหน่ง Google")} detail={copy("Search by the villa’s real Google business name or address, then drag the marker if needed.", "ค้นหาด้วยชื่อธุรกิจหรือที่อยู่จริงของวิลล่าบน Google แล้วลากหมุดหากจำเป็น")} />
    <VillaLocationPicker value={{ formattedAddress: draft.villa.formattedAddress, latitude: draft.villa.latitude, longitude: draft.villa.longitude }} onChange={(location) => setDraft((current) => ({ ...current, villa: { ...current.villa, ...location } }))} />
  </section>;
}

export function PricingSection({ draft, setDraft }: { draft: VillaEditorDraft; setDraft: SetDraft }) {
  const { locale, copy } = useAdminLocale();
  const emptyRate: Omit<RateDraft, "key"> = { labelEn: "", labelTh: "", labelSource: "", startDate: "", endDate: "", nightlyPriceThb: 0 };
  const [form, setForm] = useState<Omit<RateDraft, "key">>(emptyRate);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showRateForm, setShowRateForm] = useState(false);
  const [presetSearch, setPresetSearch] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customDates, setCustomDates] = useState(false);
  const [formError, setFormError] = useState("");
  const updateVilla = (key: "weekdayPriceThb" | "weekendPriceThb" | "securityDepositThb", value: number) => setDraft((current) => ({ ...current, villa: { ...current.villa, [key]: value } }));
  const filteredPresets = RATE_PRESETS.filter((preset) => `${preset.labelEn} ${preset.labelTh}`.toLowerCase().includes(presetSearch.toLowerCase()));
  useEffect(() => {
    const preset = RATE_PRESETS.find((item) => item.key === selectedPreset);
    if (preset) setPresetSearch(locale === "th" ? preset.labelTh : preset.labelEn);
  }, [locale, selectedPreset]);
  function openRateForm(rate?: RateDraft) {
    if (rate) {
      const preset = RATE_PRESETS.find((item) => item.labelEn === rate.labelEn && item.startDate === rate.startDate && item.endDate === rate.endDate);
      setForm({ ...rate }); setEditingKey(rate.key); setPresetSearch(preset ? translatedInputValue(locale, preset.labelEn, preset.labelTh) : rate.labelSource); setSelectedPreset(preset?.key ?? "custom"); setCustomDates(!preset);
    } else {
      setForm(emptyRate); setEditingKey(null); setPresetSearch(""); setSelectedPreset(""); setCustomDates(false);
    }
    setFormError(""); setPresetOpen(false); setShowRateForm(true);
  }
  function closeRateForm() { setShowRateForm(false); setEditingKey(null); setPresetOpen(false); setFormError(""); }
  function choosePreset(key: string) {
    setSelectedPreset(key); setPresetOpen(false);
    if (key === "custom") { setCustomDates(true); setPresetSearch(copy("Custom dates", "กำหนดวันที่เอง")); setForm((current) => ({ ...current, labelEn: "", labelTh: "", labelSource: "", startDate: "", endDate: "" })); return; }
    const preset = RATE_PRESETS.find((item) => item.key === key);
    if (!preset) return;
    setCustomDates(false); setPresetSearch(translatedInputValue(locale, preset.labelEn, preset.labelTh)); setForm((current) => ({ ...current, labelEn: preset.labelEn, labelTh: preset.labelTh, labelSource: preset.labelEn, startDate: preset.startDate, endDate: preset.endDate }));
  }
  function saveRate() {
    if (!form.labelSource.trim()) { setFormError(copy("Choose a preset or enter a custom rate name.", "เลือกค่าที่ตั้งไว้หรือกรอกชื่อราคาแบบกำหนดเอง")); return; }
    if (!form.startDate || !form.endDate || form.endDate <= form.startDate) { setFormError(copy("Choose a valid date range.", "เลือกช่วงวันที่ที่ถูกต้อง")); return; }
    if (form.nightlyPriceThb <= 0) { setFormError(copy("Enter a nightly price greater than zero.", "กรอกราคาต่อคืนที่มากกว่าศูนย์")); return; }
    setDraft((current) => ({ ...current, rates: editingKey ? current.rates.map((rate) => rate.key === editingKey ? { ...form, key: rate.key } : rate) : [...current.rates, { ...form, key: newKey("rate") }] }));
    closeRateForm(); setForm(emptyRate); setPresetSearch(""); setSelectedPreset(""); setCustomDates(false);
  }
  function moveRate(index: number, target: number) {
    if (index < 0 || target < 0 || index >= draft.rates.length || target >= draft.rates.length || index === target) return;
    setDraft((current) => { const rates = [...current.rates]; const [moved] = rates.splice(index, 1); rates.splice(target, 0, moved); return { ...current, rates }; });
  }
  return <div className="space-y-4"><AdminNotice tone="info" title={copy("Rate order controls precedence", "ลำดับราคากำหนดความสำคัญ")}>{copy("When date ranges overlap, the rate closest to the top wins. Drag rows into the order you want; weekday and weekend pricing applies when no special rate matches.", "เมื่อช่วงวันที่ทับซ้อน ราคาที่อยู่บนสุดจะถูกใช้ก่อน ลากแถวเพื่อจัดลำดับ ราคาวันธรรมดาและวันหยุดสุดสัปดาห์จะใช้เมื่อไม่มีราคาพิเศษตรงกัน")}</AdminNotice>
    <section className={`${section} grid gap-4 sm:grid-cols-3`}><SectionTitle title={copy("Standard pricing", "ราคามาตรฐาน")} detail={copy("Set the standard nightly prices and security deposit. Special rates override nightly prices.", "กำหนดราคาต่อคืนมาตรฐานและเงินประกัน ราคาพิเศษจะแทนที่ราคาต่อคืน")} className="sm:col-span-3" /><CurrencyField label={copy("Weekday price", "ราคาวันธรรมดา")} value={draft.villa.weekdayPriceThb} onChange={(value) => updateVilla("weekdayPriceThb", value)} /><CurrencyField label={copy("Weekend price", "ราคาวันหยุดสุดสัปดาห์")} value={draft.villa.weekendPriceThb} onChange={(v) => updateVilla("weekendPriceThb", v)} /><CurrencyField label={copy("Security deposit", "เงินประกัน")} value={draft.villa.securityDepositThb} onChange={(v) => updateVilla("securityDepositThb", v)} /></section>
    <section className={section}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><SectionTitle title={copy("Special rates", "ราคาพิเศษ")} detail={copy("Rank 1 wins when date ranges overlap. Drag rows to change their ranking.", "ลำดับ 1 จะถูกใช้เมื่อช่วงวันที่ทับซ้อน ลากแถวเพื่อเปลี่ยนลำดับ")} className="" />{!showRateForm ? <AdminButton variant="secondary" onClick={() => openRateForm()}><Plus size={14} /> {copy("Add rate", "เพิ่มราคา")}</AdminButton> : null}</div>
      {showRateForm ? <div className="mt-4 rounded-xl border border-[#d9ddd9] bg-[#f8faf8] p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative sm:col-span-2"><AdminField label={copy("Rate name or preset", "ชื่อราคาหรือค่าที่ตั้งไว้")} value={presetSearch} onFocus={() => setPresetOpen(true)} onBlur={() => window.setTimeout(() => setPresetOpen(false), 100)} onChange={(event) => { setPresetSearch(event.target.value); setSelectedPreset(""); setPresetOpen(true); }} placeholder={copy("Search Songkran, New Year, high season…", "ค้นหาสงกรานต์ ปีใหม่ ไฮซีซั่น…")} autoComplete="off" />
            {presetOpen ? <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#d5d8d4] bg-white p-1 shadow-lg">{filteredPresets.map((preset) => <button key={preset.key} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choosePreset(preset.key)} className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm hover:bg-[#edf4f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]"><span>{preset.labelEn} <span className="text-[#68777a]">/ {preset.labelTh}</span></span><span className="ml-3 text-[10px] text-[#68777a]">{formatRateRange(preset.startDate, preset.endDate, locale)}</span></button>)}<button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choosePreset("custom")} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-[#0f6474] hover:bg-[#edf4f2]"><Plus size={13} className="mr-2" /> {copy("Custom dates", "กำหนดวันที่เอง")}</button></div> : null}
          </div>
          {customDates ? <><AdminField label={copy("Custom rate name", "ชื่อราคาแบบกำหนดเอง")} value={translatedInputValue(locale, form.labelEn, form.labelTh)} sourceText={form.labelSource} onChange={(event) => setForm({ ...form, ...translatedInputPatch(locale, "labelSource", "labelEn", "labelTh", event.target.value) })} helper={copy("Enter English or Thai.", "กรอกภาษาอังกฤษหรือภาษาไทย")} /><AdminField label={copy("First night", "คืนแรก")} type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /><AdminField label={copy("Checkout date", "วันที่เช็กเอาต์")} type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} helper={copy("The checkout date is not charged.", "ไม่คิดค่าบริการในวันที่เช็กเอาต์")} /></> : null}
          <CurrencyField label={copy("Price per night", "ราคาต่อคืน")} value={form.nightlyPriceThb} onChange={(value) => setForm({ ...form, nightlyPriceThb: value })} />
          <div className="self-end rounded-xl border border-[#c9dcd7] bg-white p-3 text-xs leading-5 text-[#405256]"><span className="font-semibold text-[#001e33]">{copy("Applies:", "ใช้กับ:")}</span> {form.startDate && form.endDate ? formatRateRange(form.startDate, form.endDate, locale) : selectedPreset ? copy("Choose valid dates", "เลือกวันที่ที่ถูกต้อง") : copy("Choose a preset or Custom dates", "เลือกค่าที่ตั้งไว้หรือกำหนดวันที่เอง")}</div>
        </div>
        {formError ? <p role="alert" className="mt-3 text-xs font-semibold text-[#9a3f32]">{formError}</p> : null}
        <div className="mt-4 flex justify-end gap-2"><AdminButton variant="secondary" onClick={closeRateForm}>{copy("Cancel", "ยกเลิก")}</AdminButton><AdminButton onClick={saveRate} disabled={!selectedPreset && !customDates}>{editingKey ? copy("Update rate", "อัปเดตราคา") : copy("Add rate", "เพิ่มราคา")}</AdminButton></div>
      </div> : null}
      {draft.rates.length ? <AdminSortableList ids={draft.rates.map((rate) => rate.key)} onMove={(active, over) => moveRate(draft.rates.findIndex((item) => item.key === active), draft.rates.findIndex((item) => item.key === over))}><div className="mt-4 space-y-2">{draft.rates.map((rate, index) => <AdminSortableItem key={rate.key} id={rate.key} className={(dragging) => `flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center ${dragging ? "border-[#0f6474] bg-[#f2f8f5] opacity-70" : "border-[#e2e5e1] bg-white"}`}><div className="flex min-w-0 flex-1 items-center gap-2.5"><AdminDragHandle label={copy(`Reorder ${rate.labelSource}`, `จัดลำดับ ${rate.labelSource}`)} /><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#001e33] text-[11px] font-bold text-white" aria-label={copy(`Rank ${index + 1}`, `ลำดับ ${index + 1}`)}>{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#001e33]">{translatedInputValue(locale, rate.labelEn, rate.labelTh)}</p><p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[#68777a]"><span className="inline-flex items-center gap-1"><CalendarRange size={12} /> {formatRateRange(rate.startDate, rate.endDate, locale)}</span><span className="font-semibold text-[#163038]">฿{rate.nightlyPriceThb.toLocaleString()}/{copy("night", "คืน")}</span></p></div></div><div className="flex gap-1"><button type="button" onClick={() => openRateForm(rate)} className="grid size-11 place-items-center rounded-md text-[#0f6474] hover:bg-[#edf2f0]" aria-label={copy(`Edit ${rate.labelSource}`, `แก้ไข ${rate.labelSource}`)}><Pencil size={14} /></button><button type="button" onClick={() => setDraft((current) => ({ ...current, rates: current.rates.filter((item) => item.key !== rate.key) }))} className="grid size-11 place-items-center rounded-md text-[#9a3f32] hover:bg-[#fff2ed]" aria-label={copy(`Remove ${rate.labelSource}`, `ลบ ${rate.labelSource}`)}><Trash2 size={14} /></button></div></AdminSortableItem>)}</div></AdminSortableList> : !showRateForm ? <p className="mt-4 text-sm text-[#68777a]">{copy("No special rates. Weekday and weekend prices apply.", "ยังไม่มีราคาพิเศษ ระบบจะใช้ราคาวันธรรมดาและวันหยุดสุดสัปดาห์")}</p> : null}
    </section>
  </div>;
}

type CatalogOption = { key: string; label: string; leading?: ReactNode };
type SelectedCatalogItem = CatalogOption & { tone?: "standard" | "custom" };

function CatalogMultiSelect({
  label,
  placeholder,
  options,
  selected,
  emptyText,
  createLabel,
  onToggle,
  onRemove,
  onCreate,
}: {
  label: string;
  placeholder: string;
  options: CatalogOption[];
  selected: SelectedCatalogItem[];
  emptyText: string;
  createLabel: string;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedKeys = useMemo(() => new Set(selected.map((item) => item.key)), [selected]);
  const shown = useMemo(() => options.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 40), [options, search]);

  useEffect(() => setActiveIndex(0), [search]);
  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);
  useEffect(() => {
    if (!open) return;
    const closeMenu = (event: Event) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("wheel", closeMenu, { passive: true });
    window.addEventListener("touchmove", closeMenu, { passive: true });
    window.addEventListener("resize", closeMenu);
    return () => { window.removeEventListener("wheel", closeMenu); window.removeEventListener("touchmove", closeMenu); window.removeEventListener("resize", closeMenu); };
  }, [open]);

  return <>
    <div ref={rootRef} className="relative">
      <AdminField label={label} value={search} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onChange={(event) => { setSearch(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); return; } if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex((current) => event.key === "ArrowDown" ? Math.min(current + 1, shown.length) : Math.max(current - 1, 0)); return; } if (event.key === "Enter" && open) { event.preventDefault(); if (activeIndex === 0) { setOpen(false); onCreate(); } else if (shown[activeIndex - 1]) onToggle(shown[activeIndex - 1].key); } }} placeholder={placeholder} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open ? activeIndex === 0 ? `${listId}-create` : shown[activeIndex - 1] ? `${listId}-${shown[activeIndex - 1].key}` : undefined : undefined} />
      {open ? <div id={listId} role="listbox" aria-multiselectable="true" className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-[#d5d8d4] bg-white p-1 shadow-lg"><button id={`${listId}-create`} type="button" role="option" aria-selected="false" onMouseEnter={() => setActiveIndex(0)} onClick={() => { setOpen(false); onCreate(); }} className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-[#0f6474] hover:bg-[#edf6f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c66f4e] ${activeIndex === 0 ? "bg-[#edf6f3]" : ""}`}><span className="grid size-7 place-items-center rounded-md bg-[#dfeee9]"><Plus size={15} /></span>{createLabel}</button><div className="mt-1 max-h-[min(14.5rem,calc(45dvh-3.25rem))] overflow-y-auto border-t border-[#e5e7e3] pt-1">{shown.map((item, index) => <button type="button" role="option" aria-selected={selectedKeys.has(item.key)} id={`${listId}-${item.key}`} key={item.key} onMouseEnter={() => setActiveIndex(index + 1)} onClick={() => onToggle(item.key)} className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-[#f7f9f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c66f4e] ${selectedKeys.has(item.key) ? "bg-[#f2f8f5]" : index + 1 === activeIndex ? "bg-[#f7f9f7]" : ""}`}>{item.leading}<span className="min-w-0 flex-1">{item.label}</span>{selectedKeys.has(item.key) ? <span aria-hidden="true" className="text-[#0f6474]">✓</span> : null}</button>)}{!shown.length ? <p className="px-3 py-4 text-sm text-[#68777a]">{emptyText}</p> : null}</div></div> : null}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{selected.map((item) => <button type="button" key={item.key} onClick={() => onRemove(item.key)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] ${item.tone === "custom" ? "border-[#d8d0c2] bg-[#fbf7ef] text-[#163038]" : "border-[#b9d5cc] bg-[#f2f8f5] text-[#164e58]"}`}>{item.leading}{item.label}<X size={13} /></button>)}</div>
  </>;
}

export function GuestExperienceSection({ draft, amenities, houseRules, setDraft }: { draft: VillaEditorDraft; amenities: Doc<"amenities">[]; houseRules: Doc<"houseRules">[]; setDraft: SetDraft }) {
  const { locale, copy } = useAdminLocale();
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState<CustomAmenityDraft>({ key: "", slug: "", labelEn: "", labelTh: "", labelSource: "", icon: "other" });
  useEffect(() => {
    if (!customOpen) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setCustomOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [customOpen]);
  const presetAmenities = PREMADE_AMENITIES.filter((preset) => !amenities.some((item) => item.slug === preset.slug));
  function toggleAmenity(key: string) {
    if (key.startsWith("preset:")) {
      const preset = PREMADE_AMENITIES.find((item) => `preset:${item.slug}` === key);
      if (!preset) return;
      setDraft((current) => {
        const selected = current.customAmenities.some((item) => item.key === key);
        return {
          ...current,
          customAmenities: selected
            ? current.customAmenities.filter((item) => item.key !== key)
            : [...current.customAmenities, { key, slug: preset.slug, labelEn: preset.labelEn, labelTh: preset.labelTh, labelSource: preset.labelEn, icon: preset.icon }],
        };
      });
      return;
    }
    const id = key as Id<"amenities">;
    setDraft((current) => ({ ...current, amenityIds: current.amenityIds.includes(id) ? current.amenityIds.filter((item) => item !== id) : [...current.amenityIds, id] }));
  }
  function addCustom() { if (!custom.labelSource.trim() || !custom.icon) return; setDraft((current) => ({ ...current, customAmenities: [...current.customAmenities, { ...custom, key: newKey("amenity") }] })); setCustom({ key: "", slug: "", labelEn: "", labelTh: "", labelSource: "", icon: "other" }); setCustomOpen(false); }
  return <div className="grid gap-4 lg:grid-cols-2 lg:items-start"><section className={`${section} min-w-0`}><SectionTitle title={copy("Amenities", "สิ่งอำนวยความสะดวก")} detail={copy("Search the bilingual catalog or stage a custom amenity.", "ค้นหาในรายการสองภาษาหรือเพิ่มสิ่งอำนวยความสะดวกแบบกำหนดเอง")} />
    <CatalogMultiSelect label={copy("Find amenity", "ค้นหาสิ่งอำนวยความสะดวก")} placeholder={copy("Amenity name", "ชื่อสิ่งอำนวยความสะดวก")} options={[...presetAmenities.map((item) => ({ key: `preset:${item.slug}`, label: locale === "th" ? item.labelTh : item.labelEn, leading: <AmenityIcon slug={item.slug} icon={item.icon} size={18} /> })), ...amenities.map((item) => ({ key: item._id, label: locale === "th" ? item.labelTh : item.labelEn, leading: <AmenityIcon slug={item.slug} icon={item.icon} size={18} /> }))]} selected={[...draft.amenityIds.flatMap((id) => { const item = amenities.find((candidate) => candidate._id === id); return item ? [{ key: id, label: locale === "th" ? item.labelTh : item.labelEn, leading: <AmenityIcon slug={item.slug} icon={item.icon} size={16} /> }] : []; }), ...draft.customAmenities.map((item) => ({ key: item.key, label: translatedInputValue(locale, item.labelEn, item.labelTh), leading: <AmenityIcon slug={item.slug} icon={item.icon} size={16} />, tone: item.key.startsWith("preset:") ? "standard" as const : "custom" as const }))]} emptyText={copy("No amenities found.", "ไม่พบสิ่งอำนวยความสะดวก")} createLabel={copy("Create a custom amenity", "สร้างสิ่งอำนวยความสะดวกแบบกำหนดเอง")} onToggle={toggleAmenity} onRemove={(key) => { if (key.startsWith("preset:") || draft.amenityIds.includes(key as Id<"amenities">)) toggleAmenity(key); else setDraft((current) => ({ ...current, customAmenities: current.customAmenities.filter((item) => item.key !== key) })); }} onCreate={() => setCustomOpen(true)} />
    {customOpen ? <div className="fixed inset-0 z-[80] grid place-items-center bg-[#001e33]/45 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="custom-amenity-title" className="flex max-h-[min(720px,calc(100dvh-24px))] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#d5d8d4] bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[#e5e7e3] px-5 py-4"><div><h3 id="custom-amenity-title" className="text-base font-semibold text-[#001e33]">{copy("Create a custom amenity", "สร้างสิ่งอำนวยความสะดวกแบบกำหนดเอง")}</h3><p className="mt-1 text-xs leading-5 text-[#68777a]">{copy("Name the amenity and choose the icon guests will see.", "ตั้งชื่อสิ่งอำนวยความสะดวกและเลือกไอคอนที่ผู้เข้าพักจะเห็น")}</p></div><button type="button" onClick={() => setCustomOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-lg text-[#526266] hover:bg-[#f1f3f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]" aria-label={copy("Close custom amenity", "ปิดหน้าต่างสิ่งอำนวยความสะดวกแบบกำหนดเอง")}><X size={18} /></button></header><div className="min-h-0 overflow-y-auto px-5 py-4"><AdminField label={copy("Amenity name", "ชื่อสิ่งอำนวยความสะดวก")} value={translatedInputValue(locale, custom.labelEn, custom.labelTh)} sourceText={custom.labelSource} onChange={(e) => setCustom({ ...custom, ...translatedInputPatch(locale, "labelSource", "labelEn", "labelTh", e.target.value) })} helper={copy("Enter the name in English or Thai. The other language and slug are created when you save.", "กรอกชื่อเป็นภาษาอังกฤษหรือภาษาไทย ระบบจะสร้างอีกภาษาและ Slug เมื่อบันทึก")} /><fieldset className="mt-5"><legend className="text-xs font-semibold text-[#405256]">{copy("Choose an icon", "เลือกไอคอน")}</legend><div className="mt-2 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-[#d5d8d4] bg-[#f7f8f6] p-2 sm:grid-cols-3">{AMENITY_ICON_OPTIONS.map((item) => { const selected = custom.icon === item.value; return <button key={item.value} type="button" aria-pressed={selected} onClick={() => setCustom({ ...custom, icon: item.value })} className={`relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-center text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] ${selected ? "border-[#0f6474] bg-[#e7f2ee] text-[#063d48]" : "border-transparent bg-white text-[#526266] hover:border-[#b9d5cc] hover:text-[#163038]"}`}><AmenityIcon slug={item.value} icon={item.value} size={24} />{locale === "th" ? item.labelTh : item.label}{selected ? <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#0f6474] text-white"><Check size={12} /></span> : null}</button>; })}</div></fieldset></div><footer className="flex flex-col-reverse gap-2 border-t border-[#e5e7e3] bg-[#fafbf9] px-5 py-4 sm:flex-row sm:justify-end"><AdminButton variant="secondary" onClick={() => setCustomOpen(false)}>{copy("Cancel", "ยกเลิก")}</AdminButton><AdminButton disabled={!custom.labelSource.trim() || !custom.icon} onClick={addCustom}>{copy("Create amenity", "สร้างสิ่งอำนวยความสะดวก")}</AdminButton></footer></section></div> : null}
  </section><RulesEditor catalog={houseRules} rules={draft.rules} onChange={(rules) => setDraft((current) => ({ ...current, rules }))} /></div>;
}

export function IntegrationsSection({ draft, setDraft }: { draft: VillaEditorDraft; setDraft: SetDraft }) {
  const { copy } = useAdminLocale();
  return <section className={section}><SectionTitle title={copy("Google Calendar", "Google Calendar")} detail={copy("Connect the source calendar used to synchronize villa availability.", "เชื่อมต่อปฏิทินต้นทางที่ใช้ซิงค์สถานะว่างของวิลล่า")} />
    <AdminNotice tone={draft.villa.googleCalendarId ? "success" : "warning"} title={draft.villa.googleCalendarId ? copy("Calendar connected", "เชื่อมต่อปฏิทินแล้ว") : copy("Calendar not connected", "ยังไม่ได้เชื่อมต่อปฏิทิน")}>{draft.villa.googleCalendarId ? copy("The website can automatically mirror this villa's availability from Google Calendar.", "เว็บไซต์สามารถซิงค์วันว่างของวิลล่านี้จาก Google Calendar ได้อัตโนมัติ") : copy("Automatic availability updates require a saved Google Calendar ID.", "การอัปเดตวันว่างอัตโนมัติต้องมี Google Calendar ID ที่บันทึกแล้ว")}</AdminNotice>
    <div className="mt-4"><AdminField label={copy("Google Calendar ID", "รหัส Google Calendar")} optional value={draft.villa.googleCalendarId} onChange={(e) => setDraft((current) => ({ ...current, villa: { ...current.villa, googleCalendarId: e.target.value } }))} helper={copy("Clear this field and save to stop synchronization. Google Calendar is never changed.", "ล้างช่องนี้แล้วบันทึกเพื่อหยุดการซิงค์ โดย Google Calendar จะไม่ถูกเปลี่ยนแปลง")} /></div>
    <button type="button" onClick={() => window.location.assign("/admin/integrations")} className="mt-4 inline-block text-xs font-semibold text-[#0f6474] hover:underline">{copy("Open integration health", "เปิดสถานะการเชื่อมต่อ")}</button>
  </section>;
}

function RulesEditor({ catalog, rules, onChange }: { catalog: Doc<"houseRules">[]; rules: RuleDraft[]; onChange: (rules: RuleDraft[]) => void }) {
  const { locale, copy } = useAdminLocale();
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState<RuleDraft>({ key: "", textEn: "", textTh: "", textSource: "", icon: "other" });
  useEffect(() => {
    if (!customOpen) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setCustomOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [customOpen]);
  const presetRules = HOUSE_RULE_PRESETS.filter((preset) => !catalog.some((item) => item.textEn.trim().toLowerCase() === preset.textEn.toLowerCase()));
  function toggleCatalog(key: string) {
    const existing = rules.find((rule) => rule.key === key || rule.ruleId === key);
    if (existing) { onChange(rules.filter((rule) => rule.key !== existing.key)); return; }
    if (key.startsWith("preset:")) {
      const preset = HOUSE_RULE_PRESETS.find((item) => `preset:${item.textEn}` === key);
      if (preset) onChange([...rules, { key, textEn: preset.textEn, textTh: preset.textTh, textSource: preset.textEn, icon: preset.icon }]);
      return;
    }
    const item = catalog.find((rule) => rule._id === key);
    if (item) onChange([...rules, { key: newKey("rule"), ruleId: item._id, textEn: item.textEn, textTh: item.textTh, textSource: item.textSource ?? item.textEn, icon: item.icon ?? "other" }]);
  }
  function addCustom() { if (!custom.textSource.trim() || !custom.icon) return; onChange([...rules, { ...custom, key: newKey("rule") }]); setCustom({ key: "", textEn: "", textTh: "", textSource: "", icon: "other" }); setCustomOpen(false); }
  return <section className={`${section} min-w-0`}>
    <SectionTitle title={copy("House rules", "กฎของที่พัก")} detail={copy("Search the rule catalog or create a custom house rule.", "ค้นหาในรายการกฎหรือสร้างกฎของที่พักแบบกำหนดเอง")} />
    <CatalogMultiSelect label={copy("Find house rule", "ค้นหากฎของที่พัก")} placeholder={copy("House rule", "กฎของที่พัก")} options={[...presetRules.map((item) => ({ key: `preset:${item.textEn}`, label: locale === "th" ? item.textTh : item.textEn, leading: <HouseRuleIcon icon={item.icon} size={18} /> })), ...catalog.map((item) => ({ key: item._id, label: locale === "th" ? item.textTh : item.textEn, leading: <HouseRuleIcon icon={item.icon ?? "other"} size={18} /> }))]} selected={rules.map((rule) => ({ key: rule.ruleId ?? rule.key, label: translatedInputValue(locale, rule.textEn, rule.textTh), leading: <HouseRuleIcon icon={rule.icon} size={16} /> }))} emptyText={copy("No house rules found.", "ไม่พบกฎของที่พัก")} createLabel={copy("Add custom house rule…", "เพิ่มกฎของที่พักแบบกำหนดเอง…")} onToggle={toggleCatalog} onRemove={(key) => onChange(rules.filter((rule) => rule.key !== key && rule.ruleId !== key))} onCreate={() => setCustomOpen(true)} />
    {customOpen ? <div className="fixed inset-0 z-[80] grid place-items-center bg-[#001e33]/45 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="custom-rule-title" className="flex max-h-[min(720px,calc(100dvh-24px))] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#d5d8d4] bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[#e5e7e3] px-5 py-4"><div><h3 id="custom-rule-title" className="text-base font-semibold text-[#001e33]">{copy("Create a custom house rule", "สร้างกฎของที่พักแบบกำหนดเอง")}</h3><p className="mt-1 text-xs leading-5 text-[#68777a]">{copy("Enter the rule and choose the icon guests will see.", "กรอกกฎและเลือกไอคอนที่ผู้เข้าพักจะเห็น")}</p></div><button type="button" onClick={() => setCustomOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-lg text-[#526266] hover:bg-[#f1f3f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]" aria-label={copy("Close custom house rule", "ปิดหน้าต่างกฎของที่พักแบบกำหนดเอง")}><X size={18} /></button></header><div className="min-h-0 overflow-y-auto px-5 py-4"><AdminField label={copy("House rule", "กฎของที่พัก")} value={translatedInputValue(locale, custom.textEn, custom.textTh)} sourceText={custom.textSource} onChange={(event) => setCustom({ ...custom, ...translatedInputPatch(locale, "textSource", "textEn", "textTh", event.target.value) })} helper={copy("Enter the rule in English or Thai. The other language is created when you save.", "กรอกกฎเป็นภาษาอังกฤษหรือภาษาไทย ระบบจะสร้างอีกภาษาเมื่อบันทึก")} /><fieldset className="mt-5"><legend className="text-xs font-semibold text-[#405256]">{copy("Choose an icon", "เลือกไอคอน")}</legend><div className="mt-2 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-[#d5d8d4] bg-[#f7f8f6] p-2 sm:grid-cols-3">{HOUSE_RULE_ICON_OPTIONS.map((item) => { const selected = custom.icon === item.value; return <button key={item.value} type="button" aria-pressed={selected} onClick={() => setCustom({ ...custom, icon: item.value })} className={`relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-center text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] ${selected ? "border-[#0f6474] bg-[#e7f2ee] text-[#063d48]" : "border-transparent bg-white text-[#526266] hover:border-[#b9d5cc] hover:text-[#163038]"}`}><HouseRuleIcon icon={item.value} size={24} />{locale === "th" ? item.labelTh : item.labelEn}{selected ? <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#0f6474] text-white"><Check size={12} /></span> : null}</button>; })}</div></fieldset></div><footer className="flex flex-col-reverse gap-2 border-t border-[#e5e7e3] bg-[#fafbf9] px-5 py-4 sm:flex-row sm:justify-end"><AdminButton variant="secondary" onClick={() => setCustomOpen(false)}>{copy("Cancel", "ยกเลิก")}</AdminButton><AdminButton disabled={!custom.textSource.trim() || !custom.icon} onClick={addCustom}>{copy("Create house rule", "สร้างกฎของที่พัก")}</AdminButton></footer></section></div> : null}
  </section>;
}

const BED_SIZE_OPTIONS = [
  { value: "single", label: "Single", labelTh: "เตียงเดี่ยว", capacity: 1 },
  { value: "double", label: "Double", labelTh: "เตียงคู่", capacity: 2 },
  { value: "queen", label: "Queen", labelTh: "เตียงควีน", capacity: 2 },
  { value: "king", label: "King", labelTh: "เตียงคิง", capacity: 2 },
  { value: "bunk", label: "Bunk bed", labelTh: "เตียงสองชั้น", capacity: 2 },
  { value: "sofa_bed", label: "Sofa bed", labelTh: "โซฟาเบด", capacity: 2 },
  { value: "floor_mattress", label: "Floor mattress", labelTh: "ฟูกปูพื้น", capacity: 1 },
] as const;

type BedSize = (typeof BED_SIZE_OPTIONS)[number]["value"];

function bedSummary(beds: BedSize[], locale: "en" | "th" = "en") {
  return BED_SIZE_OPTIONS.flatMap((option) => {
    const count = beds.filter((bed) => bed === option.value).length;
    return count ? [`${count} ${locale === "th" ? option.labelTh : option.label}`] : [];
  }).join(" + ");
}

function SleepingEditor({ rooms, onChange, className = "" }: { rooms: SleepingDraft[]; onChange: (rooms: SleepingDraft[]) => void; className?: string }) {
  const { locale, copy } = useAdminLocale();
  const [selectedRoom, setSelectedRoom] = useState(0);
  const roomIndex = Math.min(selectedRoom, Math.max(rooms.length - 1, 0));
  const room = rooms[roomIndex];
  const beds = room?.beds ?? [];

  function updateRoom(index: number, beds: BedSize[]) {
    onChange(rooms.map((room, roomIndex) => roomIndex === index ? { ...room, beds } : room));
  }

  const roomLabel = (index: number) => copy(`Bedroom ${index + 1}`, `ห้องนอน ${index + 1}`);
  const roomTabs = (mobile: boolean) => <div role="tablist" aria-label={copy("Choose a bedroom", "เลือกห้องนอน")} className={mobile ? "grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3" : "hidden border-r border-[#d5d8d4] bg-white p-2 lg:block"}>{rooms.map((candidate, index) => { const active = index === roomIndex; return <button key={candidate.key} type="button" role="tab" aria-selected={active} onClick={() => setSelectedRoom(index)} className={`${mobile ? "min-w-0" : "mb-1 w-full last:mb-0"} rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] ${active ? "border-[#0f6474] bg-[#edf6f3] text-[#001e33]" : "border-transparent bg-white text-[#526266] hover:bg-[#f7f9f7]"}`}><span className="block text-xs font-semibold">{roomLabel(index)}</span><span className="mt-0.5 block truncate text-[10px] text-[#68777a]">{bedSummary(candidate.beds, locale)}</span></button>; })}</div>;
  return <div className={`min-w-0 border-t border-[#eee8de] pt-4 ${className}`}><div><h3 className="text-sm font-semibold text-[#001e33]">{copy("Beds by bedroom", "เตียงตามห้องนอน")}</h3><p className="mt-1 text-xs leading-5 text-[#68777a]">{copy("Select a bedroom, then add each bed and choose its size.", "เลือกห้องนอน จากนั้นเพิ่มเตียงแต่ละหลังและเลือกขนาด")}</p></div>{room ? <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-[#d5d8d4] bg-[#fbfaf6]"><div className="min-w-0 border-b border-[#d5d8d4] bg-white p-2 lg:hidden">{roomTabs(true)}</div><div className="min-w-0 lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">{roomTabs(false)}<div className="min-w-0 bg-white p-3 sm:p-4"><div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#eee8de] pb-3"><div><h4 className="text-sm font-semibold text-[#001e33]">{roomLabel(roomIndex)}</h4><p className="mt-0.5 text-xs text-[#68777a]">{copy(`${beds.length} ${beds.length === 1 ? "bed" : "beds"}`, `${beds.length} เตียง`)}</p></div><span className="rounded-md bg-[#edf6f3] px-2 py-1 text-[10px] font-semibold text-[#0f6474]">{bedSummary(beds, locale)}</span></div><div className="mt-3 space-y-2">{beds.map((bed, bedIndex) => <div key={`${room.key}-bed-${bedIndex}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2"><AdminSelect label={copy(`Bed ${bedIndex + 1} size`, `ขนาดเตียง ${bedIndex + 1}`)} value={bed} onChange={(event) => { const next = [...beds]; next[bedIndex] = event.target.value as BedSize; updateRoom(roomIndex, next); }}>{BED_SIZE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{locale === "th" ? option.labelTh : option.label}</option>)}</AdminSelect><button type="button" disabled={beds.length === 1} onClick={() => updateRoom(roomIndex, beds.filter((_, index) => index !== bedIndex))} className="grid size-11 place-items-center rounded-lg text-[#9a3f32] hover:bg-[#fff2ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] disabled:cursor-not-allowed disabled:opacity-25" aria-label={copy(`Remove bed ${bedIndex + 1} from bedroom ${roomIndex + 1}`, `ลบเตียง ${bedIndex + 1} ออกจากห้องนอน ${roomIndex + 1}`)}><Trash2 size={15} /></button></div>)}</div><AdminButton className="mt-3" variant="secondary" onClick={() => updateRoom(roomIndex, [...beds, "single"])}><Plus size={14} /> {copy("Add bed", "เพิ่มเตียง")}</AdminButton></div></div></div> : <p className="mt-3 text-sm text-[#68777a]">{copy("Choose at least one bedroom to configure beds.", "เลือกอย่างน้อยหนึ่งห้องนอนเพื่อกำหนดเตียง")}</p>}</div>;
}

function SectionTitle({ title, detail, className = "sm:col-span-2" }: { title: string; detail: string; className?: string }) { return <div className={className}><h2 className="text-base font-semibold text-[#001e33]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#68777a]">{detail}</p></div>; }
function CapacitySelect({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  if (!values.includes(value)) values.push(value);
  return <AdminSelect label={label} value={value} onChange={(event) => onChange(Number(event.target.value))}>{values.sort((a, b) => a - b).map((option) => <option key={option} value={option}>{option}</option>)}</AdminSelect>;
}

function CurrencyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="min-w-0 text-xs font-semibold text-[#405256]"><span>{label}</span><div className="relative mt-1.5"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#68777a]">฿</span><input type="text" inputMode="numeric" value={value > 0 ? value.toLocaleString("en-US") : ""} onChange={(event) => onChange(Number(event.target.value.replace(/[^0-9]/g, "")) || 0)} placeholder="0" className="min-h-11 w-full rounded-xl border border-[#d5d8d4] bg-white pl-8 pr-3.5 text-sm text-[#163038] outline-none transition hover:border-[#9daaa6] focus:border-[#0f6474] focus-visible:ring-2 focus-visible:ring-[#c66f4e]/25" /></div></label>;
}

function formatRateRange(startDate: string, checkoutDate: string, locale: "en" | "th" = "en") {
  if (!startDate || !checkoutDate) return locale === "th" ? "ยังไม่ได้เลือกวันที่" : "Dates not selected";
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const lastNight = new Date(`${checkoutDate}T00:00:00.000Z`);
  lastNight.setUTCDate(lastNight.getUTCDate() - 1);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(lastNight.valueOf())) return `${startDate} – ${checkoutDate}`;
  const format = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${format.format(start)} – ${format.format(lastNight)}`;
}

const RATE_YEAR = new Date().getFullYear();
const RATE_PRESETS = [
  { key: "songkran", labelEn: "Songkran", labelTh: "สงกรานต์", startDate: `${RATE_YEAR}-04-13`, endDate: `${RATE_YEAR}-04-16` },
  { key: "new-year", labelEn: "New Year", labelTh: "ปีใหม่", startDate: `${RATE_YEAR}-12-29`, endDate: `${RATE_YEAR + 1}-01-04` },
  { key: "christmas", labelEn: "Christmas", labelTh: "คริสต์มาส", startDate: `${RATE_YEAR}-12-24`, endDate: `${RATE_YEAR}-12-27` },
  { key: "high-season", labelEn: "High season", labelTh: "ช่วงไฮซีซั่น", startDate: `${RATE_YEAR}-12-01`, endDate: `${RATE_YEAR + 1}-04-01` },
  { key: "low-season", labelEn: "Low season", labelTh: "ช่วงโลว์ซีซั่น", startDate: `${RATE_YEAR}-05-01`, endDate: `${RATE_YEAR}-11-01` },
  { key: "peak-season", labelEn: "Peak season", labelTh: "ช่วงพีคซีซั่น", startDate: `${RATE_YEAR}-07-01`, endDate: `${RATE_YEAR}-09-01` },
];
