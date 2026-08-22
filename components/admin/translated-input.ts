import type { AdminLocale } from "./AdminLocale";

export function translatedInputValue(locale: AdminLocale, english: string, thai: string) {
  return locale === "th" ? thai : english;
}

export function translatedInputPatch(locale: AdminLocale, sourceKey: string, englishKey: string, thaiKey: string, value: string) {
  return { [sourceKey]: value, [locale === "th" ? thaiKey : englishKey]: value };
}
