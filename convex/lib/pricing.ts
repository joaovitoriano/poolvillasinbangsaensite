import type { Doc } from "../_generated/dataModel";
import { enumerateNights, isWeekendNight, parseDate } from "./dates";

export type NightlyQuote = {
  date: string;
  priceThb: number;
  rateKind: "weekday" | "weekend" | "special";
  rateLabel: string;
};

export function calculateQuote(
  villa: Pick<Doc<"villas">, "weekdayPriceThb" | "weekendPriceThb">,
  specialRates: Array<Pick<Doc<"specialRates">, "labelEn" | "startDate" | "endDate" | "recurringDay" | "nightlyPriceThb" | "sortOrder">>,
  checkIn: string,
  checkOut: string,
) {
  const nights: NightlyQuote[] = enumerateNights(checkIn, checkOut).map((date) => {
    const matching = specialRates
      .filter((rate) => rate.recurringDay === "sunday"
        ? parseDate(date).getUTCDay() === 0
        : rate.startDate <= date && date < rate.endDate)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const selected = matching[0];
    if (selected) return { date, priceThb: selected.nightlyPriceThb, rateKind: "special" as const, rateLabel: selected.labelEn };
    if (isWeekendNight(date)) return { date, priceThb: villa.weekendPriceThb ?? villa.weekdayPriceThb, rateKind: "weekend" as const, rateLabel: "Weekend rate" };
    return { date, priceThb: villa.weekdayPriceThb, rateKind: "weekday" as const, rateLabel: "Weekday rate" };
  });
  return { nights, totalThb: nights.reduce((sum, night) => sum + night.priceThb, 0) };
}
