"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Mail,
  MessageCircle,
  MinusCircle,
  Phone,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatNumericDateRange } from "@/lib/date-format";
import {
  AdminButton,
  AdminEmptyState,
  AdminField,
  AdminPanel,
  AdminSkeleton,
  AdminStatusBadge,
  AdminToast,
  ConfirmDialog,
} from "./AdminUI";
import { useAdminLocale } from "./AdminLocale";

type InquiryRow = FunctionReturnType<typeof api.bookingRequests.listAdmin>[number];
type Delivery = InquiryRow["notifications"][number];

function InquiryToolbar({ search, count, onSearchChange }: {
  search: string;
  count: number;
  onSearchChange: (value: string) => void;
}) {
  const { copy } = useAdminLocale();
  return (
    <AdminPanel className="overflow-visible">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between sm:p-4">
        <div className="w-full sm:max-w-xl">
          <AdminField
            label={copy("Search inquiries", "ค้นหาคำขอจอง")}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={copy("Villa, phone, or LINE", "วิลล่า โทรศัพท์ หรือ LINE")}
          />
        </div>
        <p className="pb-3 text-xs font-semibold tabular-nums text-[#68777a] sm:pb-3.5">
          {copy(`${count} new`, `ใหม่ ${count} รายการ`)}
        </p>
      </div>
    </AdminPanel>
  );
}

function DeliveryStatus({ delivery }: { delivery: Delivery }) {
  const { copy } = useAdminLocale();
  const sent = delivery.status === "sent";
  const pending = delivery.status === "pending";
  const ChannelIcon = delivery.channel === "email" ? Mail : MessageCircle;
  const StatusIcon = sent ? CheckCircle2 : pending ? Clock3 : MinusCircle;
  const label = sent
    ? copy("Sent", "ส่งแล้ว")
    : pending
      ? copy("Sending", "กำลังส่ง")
      : copy("Not sent", "ยังไม่ได้ส่ง");
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-t border-[#ece7df] py-2 first:border-t-0">
      <span className="flex min-w-0 items-center gap-2.5 text-xs font-semibold text-[#405256]">
        <ChannelIcon size={15} className="shrink-0 text-[#68777a]" />
        {delivery.channel === "email" ? copy("Email", "อีเมล") : "LINE"}
      </span>
      <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${sent ? "text-[#276553]" : "text-[#68777a]"}`}>
        <StatusIcon size={14} />
        {label}
      </span>
    </div>
  );
}

function NotificationPopover({ deliveries }: { deliveries: Delivery[] }) {
  const { copy } = useAdminLocale();
  const issues = deliveries.filter((delivery) => delivery.status !== "sent").length;
  const triggerLabel = issues
    ? copy(`Open notification status: ${issues} issue${issues === 1 ? "" : "s"}`, `เปิดสถานะการแจ้งเตือน: ${issues} ปัญหา`)
    : copy("Open notification status", "เปิดสถานะการแจ้งเตือน");
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          title={copy("Notification status", "สถานะการแจ้งเตือน")}
          className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-[#d8d5ce] bg-white text-[#0f6474] transition hover:border-[#0f6474] hover:bg-[#eef5f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] focus-visible:ring-offset-2"
        >
          <Bell size={17} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="end" sideOffset={7} collisionPadding={12} className="z-[90] w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-[#d8d5ce] bg-white p-3 shadow-[0_12px_30px_rgba(0,30,51,.16)] outline-none">
          <p className="text-xs font-semibold text-[#001e33]">{copy("Notification status", "สถานะการแจ้งเตือน")}</p>
          <div className="mt-1.5">
            {deliveries.length
              ? deliveries.map((delivery) => <DeliveryStatus key={delivery._id} delivery={delivery} />)
              : <p className="py-2 text-xs text-[#7c8788]">{copy("No notification record", "ไม่มีประวัติการแจ้งเตือน")}</p>}
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ReceivedTime({ createdAt }: { createdAt: number }) {
  const { locale, copy } = useAdminLocale();
  const [now, setNow] = useState(createdAt);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const elapsedMinutes = Math.max(0, Math.floor((now - createdAt) / 60_000));
  const relative = elapsedMinutes < 1
    ? copy("just now", "เมื่อสักครู่")
    : elapsedMinutes < 60
      ? copy(`${elapsedMinutes} min ago`, `${elapsedMinutes} นาทีที่แล้ว`)
      : elapsedMinutes < 24 * 60
        ? copy(`${Math.floor(elapsedMinutes / 60)} hr ago`, `${Math.floor(elapsedMinutes / 60)} ชั่วโมงที่แล้ว`)
        : copy(`${Math.floor(elapsedMinutes / (24 * 60))} day${Math.floor(elapsedMinutes / (24 * 60)) === 1 ? "" : "s"} ago`, `${Math.floor(elapsedMinutes / (24 * 60))} วันที่แล้ว`);
  return <time dateTime={new Date(createdAt).toISOString()} title={new Date(createdAt).toLocaleString(locale === "th" ? "th-TH" : "en-GB")}>{copy("Received", "ได้รับ")} {relative}</time>;
}

function ContactRow({ label, value, icon: Icon, onCopy }: {
  label: string;
  value: string;
  icon: typeof Phone;
  onCopy: () => void;
}) {
  const { copy } = useAdminLocale();
  const content = <>
      <span className="flex min-w-20 items-center gap-2 text-xs font-medium text-[#68777a]"><Icon size={15} className="shrink-0 text-[#0f6474]" />{label}</span>
      <span className="min-w-0 truncate text-sm font-semibold text-[#001e33]" title={value || undefined}>{value || copy("N/A", "ไม่มีข้อมูล")}</span>
      {value ? <span className="inline-flex min-h-10 items-center gap-1.5 px-2.5 text-xs font-semibold text-[#0f6474]"><Clipboard size={14} />{copy("Copy", "คัดลอก")}</span> : null}
    </>;
  const className = "grid min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-2.5 text-left sm:px-5";
  if (!value) return <div className={className}>{content}</div>;
  return <button type="button" onClick={onCopy} aria-label={copy(`Copy ${label}`, `คัดลอก ${label}`)} title={copy(`Copy ${label}`, `คัดลอก ${label}`)} className={`${className} transition hover:bg-[#eef5f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c66f4e]`}>{content}</button>;
}

function InquiryCard({ row, busyId, onCopy, onMarkViewed }: {
  row: InquiryRow;
  busyId: string | null;
  onCopy: (kind: "phone" | "line", value: string) => void;
  onMarkViewed: (requestId: Id<"bookingRequests">, villaName: string) => void;
}) {
  const { locale, copy } = useAdminLocale();
  const { request, villa, notifications } = row;
  const villaName = villa
    ? (locale === "th" ? villa.nameTh : villa.nameEn)
    : copy("Unknown villa", "ไม่ทราบวิลล่า");
  return (
    <article className="overflow-hidden rounded-xl border border-[#dddeda] bg-white transition-colors hover:border-[#bdc8c3]">
      <header className="flex items-start justify-between gap-3 bg-[#fcfcfa] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-[-.01em] text-[#001e33]">{villaName}</h2>
            <AdminStatusBadge tone="warning">{copy("new", "ใหม่")}</AdminStatusBadge>
          </div>
          <p className="mt-1 text-xs text-[#68777a]"><ReceivedTime createdAt={request._creationTime} /></p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#001e33]"><CalendarDays size={15} className="shrink-0 text-[#0f6474]" />{formatNumericDateRange(request.checkIn, request.checkOut)}</p>
        </div>
        <NotificationPopover deliveries={notifications} />
      </header>

      <div className="divide-y divide-[#ece7df] border-t border-[#e8e5df] sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <ContactRow label={copy("Phone", "โทรศัพท์")} value={request.phone ?? ""} icon={Phone} onCopy={() => onCopy("phone", request.phone ?? "")} />
        <ContactRow label="LINE" value={request.lineId ?? ""} icon={MessageCircle} onCopy={() => onCopy("line", request.lineId ?? "")} />
      </div>

      <footer className="flex justify-end border-t border-[#e8e5df] bg-[#f8f8f5] px-3 py-2.5 sm:px-4">
        <AdminButton busy={busyId === request._id} busyLabel={copy("Updating…", "กำลังอัปเดต…")} className="w-full px-4 sm:w-auto" onClick={() => onMarkViewed(request._id, villaName)}>
          <Check size={14} /> {copy("Mark viewed", "ทำเครื่องหมายว่าดูแล้ว")}
        </AdminButton>
      </footer>
    </article>
  );
}

export function AdminInquiries() {
  const { locale, copy } = useAdminLocale();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState<{ requestId: Id<"bookingRequests">; villaName: string } | null>(null);
  const rows = useQuery(api.bookingRequests.listAdmin, { limit: 100 });
  const markViewed = useMutation(api.bookingRequests.markViewed);

  const visible = useMemo(() => {
    if (!rows) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(({ request, villa }) =>
      [request.phone, request.lineId, villa?.nameEn, villa?.nameTh]
        .some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [rows, search]);

  async function update(requestId: Id<"bookingRequests">, villaName: string) {
    setBusyId(requestId);
    setFeedback(null);
    try {
      await markViewed({ requestId });
      setFeedback({ tone: "success", text: copy(`${villaName} inquiry marked viewed.`, `ทำเครื่องหมายคำขอของ ${villaName} ว่าดูแล้ว`) });
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error && locale === "en" ? error.message : copy("Could not mark the inquiry viewed.", "ไม่สามารถทำเครื่องหมายคำขอว่าดูแล้ว") });
    } finally {
      setBusyId(null);
    }
  }

  async function copyContact(kind: "phone" | "line", value: string) {
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({
        tone: "success",
        text: kind === "phone"
          ? copy("Phone number copied.", "คัดลอกเบอร์โทรศัพท์แล้ว")
          : copy("LINE ID copied.", "คัดลอก LINE ID แล้ว"),
      });
    } catch {
      setFeedback({
        tone: "error",
        text: kind === "phone"
          ? copy("Could not copy the phone number.", "ไม่สามารถคัดลอกเบอร์โทรศัพท์ได้")
          : copy("Could not copy the LINE ID.", "ไม่สามารถคัดลอก LINE ID ได้"),
      });
    }
  }

  return (
    <div className="space-y-4">
      {feedback ? <AdminToast tone={feedback.tone}>{feedback.text}</AdminToast> : null}
      <InquiryToolbar search={search} count={rows?.length ?? 0} onSearchChange={setSearch} />
      {rows === undefined
        ? <AdminPanel><AdminSkeleton rows={4} /></AdminPanel>
        : rows.length === 0
          ? <AdminPanel><AdminEmptyState title={copy("No new inquiries", "ไม่มีคำขอจองใหม่")} detail={copy("New inquiries will appear here until they are marked viewed.", "คำขอจองใหม่จะแสดงที่นี่จนกว่าจะทำเครื่องหมายว่าดูแล้ว")} /></AdminPanel>
          : visible.length === 0
            ? <AdminPanel><AdminEmptyState title={copy("No matching inquiries", "ไม่พบคำขอจองที่ตรงกัน")} detail={copy("Try another villa, phone number, or LINE ID.", "ลองค้นหาด้วยวิลล่า เบอร์โทรศัพท์ หรือ LINE ID อื่น")} action={<AdminButton variant="secondary" onClick={() => setSearch("")}>{copy("Clear search", "ล้างการค้นหา")}</AdminButton>} /></AdminPanel>
            : <div className="space-y-3">{visible.map((row) => (
                <InquiryCard
                  key={row.request._id}
                  row={row}
                  busyId={busyId}
                  onCopy={(kind, value) => void copyContact(kind, value)}
                  onMarkViewed={(requestId, villaName) => setPending({ requestId, villaName })}
                />
              ))}</div>}
      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => { if (pending) { const value = pending; setPending(null); void update(value.requestId, value.villaName); } }}
        title={copy("Mark this inquiry viewed?", "ทำเครื่องหมายว่าดูคำขอนี้แล้วหรือไม่")}
        description={copy("This inquiry will disappear from the admin inquiry view after you continue.", "คำขอนี้จะหายไปจากหน้าคำขอจองของผู้ดูแลหลังจากดำเนินการต่อ")}
        confirmLabel={copy("Mark viewed", "ทำเครื่องหมายว่าดูแล้ว")}
      />
    </div>
  );
}
