"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { PageFrame } from "@/components/page-frame";
import { VillaCalendar } from "@/components/villa-calendar";

export default function VillaCalendarPage() { return <Suspense><CalendarContent /></Suspense>; }

function CalendarContent() {
  const searchParams = useSearchParams();
  const params = useParams<{ villaId: string }>();
  const villaId = params.villaId as Id<"villas">;
  return (
    <PageFrame title={{ en: "Calendar", th: "ปฏิทิน" }} hideHeaderOnMobile>
      <VillaCalendar key={searchParams.toString()} villaId={villaId} initialClosedDateId={(searchParams.get("closedDateId") || undefined) as Id<"closedDates"> | undefined} />
    </PageFrame>
  );
}
