import type { Id } from "@/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { translateToEnglishAndThai, type EnglishThaiTranslation } from "@/lib/browser-translation";

export type VillaDetailsDraft = {
  slug: string;
  nameEn: string;
  nameTh: string;
  nameSource: string;
  descriptionEn: string;
  descriptionTh: string;
  descriptionSource: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  weekdayPriceThb: number;
  weekendPriceThb: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  parkingSpaces: number;
  checkInTime: string;
  checkOutTime: string;
  securityDepositThb: number;
  sortOrder: number;
  googleCalendarId: string;
};

export type RateDraft = {
  key: string;
  rateId?: Id<"specialRates">;
  labelEn: string;
  labelTh: string;
  labelSource: string;
  startDate: string;
  endDate: string;
  nightlyPriceThb: number;
};

export type RuleDraft = { key: string; ruleId?: Id<"houseRules">; textEn: string; textTh: string; textSource: string; icon: string };
export type BedType = "single" | "double" | "queen" | "king" | "bunk" | "sofa_bed" | "floor_mattress";
export type SleepingDraft = { key: string; sleepingId?: Id<"sleepingArrangements">; bedroomNumber: number; beds: BedType[] };
export type PhotoDraft = {
  key: string;
  photoId?: Id<"villaPhotos">;
  storageId?: Id<"_storage">;
  thumbnailStorageId?: Id<"_storage">;
  externalUrl?: string;
  url: string;
  thumbnailUrl?: string;
  file?: File;
};
export type CustomAmenityDraft = { key: string; slug: string; labelEn: string; labelTh: string; labelSource: string; icon: string };

export type VillaEditorDraft = {
  villa: VillaDetailsDraft;
  rates: RateDraft[];
  amenityIds: Id<"amenities">[];
  customAmenities: CustomAmenityDraft[];
  rules: RuleDraft[];
  sleeping: SleepingDraft[];
  photos: PhotoDraft[];
};
export type VillaEditorSection = "villa" | "rates" | "photos" | "amenities" | "rules" | "sleeping";

type ConvexApi = typeof import("@/convex/_generated/api").api;
export type VillaEditorDetail = NonNullable<FunctionReturnType<ConvexApi["villaEditor"]["get"]>>;

export const blankVilla: VillaDetailsDraft = {
  slug: "", nameEn: "", nameTh: "", nameSource: "", descriptionEn: "", descriptionTh: "", descriptionSource: "",
  formattedAddress: "",
  latitude: 13.284, longitude: 100.925, weekdayPriceThb: 7000, weekendPriceThb: 9000,
  bedrooms: 3, bathrooms: 3, maxGuests: 14, parkingSpaces: 3, checkInTime: "14:00", checkOutTime: "11:00",
  securityDepositThb: 5000, sortOrder: 10, googleCalendarId: "",
};

export function normalizeSleepingRooms(rooms: SleepingDraft[], bedrooms: number): SleepingDraft[] {
  const count = Math.max(1, Math.min(20, Math.round(bedrooms)));
  return Array.from({ length: count }, (_, index) => {
    const existing = rooms[index];
    return {
      key: existing?.key ?? `bedroom-${index + 1}`,
      sleepingId: existing?.sleepingId,
      bedroomNumber: index + 1,
      beds: existing?.beds.length ? existing.beds : ["king"],
    };
  });
}

export function createBlankDraft(): VillaEditorDraft {
  return { villa: { ...blankVilla }, rates: [], amenityIds: [], customAmenities: [], rules: [], sleeping: normalizeSleepingRooms([], blankVilla.bedrooms), photos: [] };
}

export function villaSlugFromEnglish(nameEn: string) {
  return nameEn.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function detailToDraft(detail: VillaEditorDetail): VillaEditorDraft {
  const villa = detail.details;
  return {
    villa: {
      slug: villa.slug, nameEn: villa.nameEn, nameTh: villa.nameTh, nameSource: villa.nameSource ?? villa.nameEn,
      descriptionEn: villa.descriptionEn, descriptionTh: villa.descriptionTh, descriptionSource: villa.descriptionSource ?? villa.descriptionEn,
      formattedAddress: villa.formattedAddress,
      latitude: villa.latitude, longitude: villa.longitude, weekdayPriceThb: villa.weekdayPriceThb,
      weekendPriceThb: villa.weekendPriceThb ?? villa.weekdayPriceThb, bedrooms: villa.bedrooms, bathrooms: villa.bathrooms, maxGuests: villa.maxGuests,
      parkingSpaces: villa.parkingSpaces, checkInTime: villa.checkInTime, checkOutTime: villa.checkOutTime,
      securityDepositThb: villa.securityDepositThb ?? 0,
      sortOrder: villa.sortOrder, googleCalendarId: villa.googleCalendarId ?? "",
    },
    rates: [...detail.rates].map((rate) => ({ key: rate.clientKey, rateId: rate.rateId, labelEn: rate.labelEn, labelTh: rate.labelTh, labelSource: rate.labelSource, startDate: rate.startDate, endDate: rate.endDate, nightlyPriceThb: rate.nightlyPriceThb })),
    amenityIds: detail.amenities.map((amenity) => amenity.amenityId), customAmenities: [],
    rules: detail.rules.map((rule) => ({ key: rule.clientKey, ruleId: rule.ruleId, textEn: rule.textEn, textTh: rule.textTh, textSource: rule.textSource, icon: rule.icon ?? "other" })),
    sleeping: normalizeSleepingRooms(detail.sleeping.map((room) => ({ key: room.clientKey, sleepingId: room.sleepingId, bedroomNumber: room.bedroomNumber, beds: room.beds })), villa.bedrooms),
    photos: detail.photos.map((photo) => ({ key: photo.clientKey, photoId: photo.photoId, storageId: photo.storageId ?? undefined, thumbnailStorageId: photo.thumbnailStorageId ?? undefined, externalUrl: photo.externalUrl ?? undefined, url: photo.url ?? photo.externalUrl ?? "", thumbnailUrl: photo.thumbnailUrl ?? photo.url ?? undefined })),
  };
}

export function draftFingerprint(draft: VillaEditorDraft) {
  return JSON.stringify({ ...draft, photos: draft.photos.map((photo) => ({ ...photo, file: undefined })) });
}

export function changedEditorSections(draft: VillaEditorDraft, baseline: VillaEditorDraft): VillaEditorSection[] {
  const changed: VillaEditorSection[] = [];
  const differs = (left: unknown, right: unknown) => JSON.stringify(left) !== JSON.stringify(right);
  if (differs(draft.villa, baseline.villa)) changed.push("villa");
  if (differs(draft.rates, baseline.rates)) changed.push("rates");
  if (differs(
    draft.photos.map(({ file, ...photo }) => ({ ...photo, hasNewFile: Boolean(file) })),
    baseline.photos.map(({ file, ...photo }) => ({ ...photo, hasNewFile: Boolean(file) })),
  )) changed.push("photos");
  if (differs({ ids: draft.amenityIds, custom: draft.customAmenities }, { ids: baseline.amenityIds, custom: baseline.customAmenities })) changed.push("amenities");
  if (differs(draft.rules, baseline.rules)) changed.push("rules");
  if (differs(draft.sleeping, baseline.sleeping)) changed.push("sleeping");
  return changed;
}

export async function translateChangedDraft(draft: VillaEditorDraft, baseline: VillaEditorDraft): Promise<VillaEditorDraft> {
  const next: VillaEditorDraft = {
    ...draft,
    villa: { ...draft.villa },
    rates: draft.rates.map((item) => ({ ...item })),
    customAmenities: draft.customAmenities.map((item) => ({ ...item })),
    rules: draft.rules.map((item) => ({ ...item })),
    sleeping: draft.sleeping.map((item) => ({ ...item })),
    photos: draft.photos.map((item) => ({ ...item })),
  };
  const targets: Array<{ source: string; apply: (translation: EnglishThaiTranslation) => void }> = [];
  const add = (source: string, english: string, thai: string, previousSource: string | undefined, apply: (english: string, thai: string) => void) => {
    const value = source.trim();
    const previousValue = (previousSource ?? "").trim();
    if (value === previousValue && english.trim() && thai.trim()) return;
    if (!value) { apply("", ""); return; }
    if (previousSource === undefined && ((value === english.trim() && thai.trim()) || (value === thai.trim() && english.trim()))) return;
    targets.push({ source: value, apply: (translation) => apply(translation.english, translation.thai) });
  };

  const villaFields = [
    ["nameSource", "nameEn", "nameTh"],
    ["descriptionSource", "descriptionEn", "descriptionTh"],
  ] as const;
  for (const [sourceKey, englishKey, thaiKey] of villaFields) {
    add(next.villa[sourceKey], next.villa[englishKey], next.villa[thaiKey], baseline.villa[sourceKey], (english, thai) => {
      next.villa[englishKey] = english;
      next.villa[thaiKey] = thai;
    });
  }

  next.rates.forEach((item) => {
    const previous = baseline.rates.find((candidate) => candidate.key === item.key);
    add(item.labelSource, item.labelEn, item.labelTh, previous?.labelSource, (english, thai) => { item.labelEn = english; item.labelTh = thai; });
  });
  next.customAmenities.forEach((item) => {
    const previous = baseline.customAmenities.find((candidate) => candidate.key === item.key);
    add(item.labelSource, item.labelEn, item.labelTh, previous?.labelSource, (english, thai) => { item.labelEn = english; item.labelTh = thai; });
  });
  next.rules.forEach((item) => {
    const previous = baseline.rules.find((candidate) => candidate.key === item.key);
    add(item.textSource, item.textEn, item.textTh, previous?.textSource, (english, thai) => { item.textEn = english; item.textTh = thai; });
  });
  if (!targets.length) return next;
  const translations = await translateToEnglishAndThai(targets.map((target) => target.source));
  const bySource = new Map(translations.map((translation) => [translation.source, translation]));
  targets.forEach((target) => {
    const translation = bySource.get(target.source);
    if (!translation) throw new Error("Translation failed. Your changes were not saved. / การแปลไม่สำเร็จ ระบบยังไม่ได้บันทึกการเปลี่ยนแปลงของคุณ");
    target.apply(translation);
  });
  return next;
}

export function newKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
