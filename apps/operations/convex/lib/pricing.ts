import type { Doc } from "../_generated/dataModel";

function utcDay(date: string) {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

export function pricingPresetMatches(preset: Doc<"pricingPresets">, date: string) {
  if (!preset.active) return false;
  if (preset.dateFrom && preset.dateTo) return date >= preset.dateFrom && date <= preset.dateTo;
  return preset.daysOfWeek.includes(utcDay(date));
}

export function resolvePricingPreset(presets: Doc<"pricingPresets">[], date: string) {
  const sorted = [...presets].sort((a, b) => a.sortOrder - b.sortOrder);
  const defaultPreset = sorted.find((preset) => preset.isDefault);
  const preset = sorted.find((item) => !item.isDefault && pricingPresetMatches(item, date)) ?? defaultPreset;
  return { defaultPreset, preset };
}
