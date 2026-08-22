export type CalendarEventLike = {
  name: string;
  startDate: string;
  endDate: string;
};

const DAY_MS = 86_400_000;

export function isClosedEventTitle(title: string) {
  return /\bCLOSED\b/.test(title);
}

function addIsoDays(value: string, amount: number) {
  return new Date(new Date(`${value}T00:00:00.000Z`).getTime() + amount * DAY_MS).toISOString().slice(0, 10);
}

export function eventVisualEndExclusive(block: CalendarEventLike) {
  return isClosedEventTitle(block.name) ? block.endDate : addIsoDays(block.endDate, 1);
}

export function layoutCalendarEvents<T extends CalendarEventLike>(blocks: T[], dates: string[]) {
  if (!dates.length) return [];
  const rangeStart = dates[0];
  const rangeEnd = addIsoDays(dates[dates.length - 1], 1);
  const occupiedUntil = [0, 0];
  return [...blocks]
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))
    .filter((block) => block.startDate < rangeEnd && eventVisualEndExclusive(block) > rangeStart)
    .map((block) => {
      const firstInside = dates.findIndex((date) => date >= block.startDate);
      const firstAfter = dates.findIndex((date) => date >= eventVisualEndExclusive(block));
      const startIndex = firstInside < 0 ? 0 : firstInside;
      const endIndex = firstAfter < 0 ? dates.length : firstAfter;
      const lane = startIndex >= occupiedUntil[0] ? 0 : 1;
      occupiedUntil[lane] = Math.max(occupiedUntil[lane], endIndex);
      return { block, startIndex, endIndex, lane };
    });
}
