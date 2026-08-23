import type { AdminLocale } from "./AdminLocale";

export function localizedInputValue(locale: AdminLocale, english: string, thai: string) {
  return locale === "th" ? thai : english;
}

export function localizedInputPatch(
  locale: AdminLocale,
  englishKey: string,
  thaiKey: string,
  value: string,
) {
  return { [locale === "th" ? thaiKey : englishKey]: value };
}
