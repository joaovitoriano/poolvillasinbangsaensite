import { translateToEnglishAndThai } from "@/lib/browser-translation";

export type SettingsBilingualField = {
  source: string;
  previousSource: string;
  english: string;
  thai: string;
};

export type SettingsBilingualContent = {
  title: SettingsBilingualField;
  description: SettingsBilingualField;
};

export async function translateChangedSettingsContent(content: SettingsBilingualContent): Promise<SettingsBilingualContent> {
  const next = Object.fromEntries(
    Object.entries(content).map(([key, field]) => [key, { ...field, source: field.source.trim() }]),
  ) as SettingsBilingualContent;
  const changed = Object.values(next).filter((field) => {
    if (field.source === field.previousSource.trim() && field.english.trim() && field.thai.trim()) return false;
    return true;
  });
  if (!changed.length) return next;
  const empty = changed.filter((field) => !field.source);
  for (const field of empty) {
    field.english = "";
    field.thai = "";
  }
  const translatable = changed.filter((field) => field.source);
  if (!translatable.length) return next;
  const translated = await translateToEnglishAndThai(translatable.map((field) => field.source));
  const translations = new Map(translated.map((item) => [item.source, item]));
  for (const field of translatable) {
    const result = translations.get(field.source);
    if (!result) throw new Error("Translation failed. Your settings were not saved. / การแปลไม่สำเร็จ ระบบยังไม่ได้บันทึกการตั้งค่าของคุณ");
    field.english = result.english;
    field.thai = result.thai;
  }
  return next;
}
