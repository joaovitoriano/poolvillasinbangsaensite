"use client";

import { useQuery } from "convex/react";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { formatDate, formatThb } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const entities: Record<string, { en: string; th: string }> = {
  bookings: { en: "Booking", th: "การจอง" }, closedDates: { en: "Closed date", th: "วันที่ปิด" },
  villas: { en: "Villa", th: "วิลล่า" }, pricingPresets: { en: "Pricing preset", th: "ราคาที่ตั้งไว้" },
  operationsUsers: { en: "Profile", th: "โปรไฟล์" }, villaInvitations: { en: "Invitation", th: "คำเชิญ" },
  villaAssignments: { en: "Team membership", th: "สมาชิกทีม" }, guests: { en: "Guest", th: "ผู้เข้าพัก" },
};
const fields: Record<string, { en: string; th: string }> = {
  reason: { en: "Action", th: "การดำเนินการ" },
  subtotalThb: { en: "Original booking value", th: "ยอดจองก่อนหักส่วนลด" },
  creatorCommissionThb: { en: "Commission amount", th: "ยอดค่าคอมมิชชัน" },
  villaNetThb: { en: "Net revenue", th: "รายได้สุทธิ" },
  createdBy: { en: "Created by", th: "สร้างโดย" },
  checkIn: { en: "Check-in", th: "เช็กอิน" }, checkOut: { en: "Check-out", th: "เช็กเอาต์" },
  from: { en: "From", th: "จาก" }, to: { en: "To", th: "ถึง" }, status: { en: "Status", th: "สถานะ" },
  discountThb: { en: "Discount", th: "ส่วนลด" }, totalChargedThb: { en: "Booking total", th: "ยอดรวมการจอง" },
  discountMode: { en: "Discount type", th: "ประเภทส่วนลด" }, discountValue: { en: "Discount value", th: "ค่าส่วนลด" },
  commissionMode: { en: "Commission type", th: "ประเภทค่าคอมมิชชัน" }, commissionValue: { en: "Commission", th: "ค่าคอมมิชชัน" },
  notes: { en: "Notes", th: "หมายเหตุ" }, name: { en: "Name", th: "ชื่อ" }, contactName: { en: "Owner name", th: "ชื่อเจ้าของ" },
  contactPhone: { en: "Phone", th: "โทรศัพท์" }, contactLineId: { en: "LINE ID", th: "ไลน์ไอดี" },
  phone: { en: "Phone", th: "โทรศัพท์" }, lineId: { en: "LINE ID", th: "ไลน์ไอดี" },
  guestName: { en: "Guest name", th: "ชื่อผู้เข้าพัก" }, guestPhone: { en: "Guest phone", th: "โทรศัพท์ผู้เข้าพัก" }, guestLineId: { en: "Guest LINE ID", th: "ไลน์ไอดีผู้เข้าพัก" },
  archived: { en: "Archived", th: "เก็บถาวร" }, nightlyPriceThb: { en: "Nightly price", th: "ราคาต่อคืน" }, daysOfWeek: { en: "Days", th: "วัน" },
  dateFrom: { en: "From", th: "จาก" }, dateTo: { en: "To", th: "ถึง" }, sortOrder: { en: "Order", th: "ลำดับ" },
  active: { en: "Active", th: "ใช้งาน" }, isDefault: { en: "Default", th: "ค่าเริ่มต้น" }, role: { en: "Role", th: "บทบาท" },
  accountMode: { en: "Account type", th: "ประเภทบัญชี" },
  email: { en: "Email", th: "อีเมล" }, userId: { en: "Member", th: "สมาชิก" },
};
const values: Record<string, { en: string; th: string }> = {
  bookingToClosedDate: { en: "Booking replaced with a closed date", th: "เปลี่ยนการจองเป็นวันที่ปิด" },
  closedDateToBooking: { en: "Closed date replaced with a booking", th: "เปลี่ยนวันที่ปิดเป็นการจอง" },
  revoked: { en: "Revoked", th: "เพิกถอนแล้ว" }, expired: { en: "Expired", th: "หมดอายุแล้ว" },
  confirmed: { en: "Confirmed", th: "ยืนยันแล้ว" }, cancelled: { en: "Cancelled", th: "ยกเลิกแล้ว" },
  active: { en: "Active", th: "ใช้งาน" }, pending: { en: "Pending", th: "รอดำเนินการ" }, accepted: { en: "Accepted", th: "ตอบรับแล้ว" },
  true: { en: "Yes", th: "ใช่" }, false: { en: "No", th: "ไม่" }, amount: { en: "Baht", th: "บาท" }, percentage: { en: "Percent", th: "เปอร์เซ็นต์" },
  admin: { en: "Operations Admin", th: "ผู้ดูแลระบบ" }, owner: { en: "Owner", th: "เจ้าของ" }, agent: { en: "Agent", th: "ตัวแทน" },
};
export function ActivityTable() {
  const { locale, t } = useLocale();
  const [page, setPage] = useState(1);
  const heading = useRef<HTMLHeadingElement>(null);
  const data = useQuery(api.activity.list, { page });
  const currentPage = data?.currentPage ?? page;
  const changePage = (number: number) => {
    setPage(number);
    heading.current?.scrollIntoView({ block: "start" });
    heading.current?.focus({ preventScroll: true });
  };
  const firstPage = Math.max(1, Math.min(currentPage - 2, (data?.pageCount ?? 1) - 4));
  const pageNumbers = Array.from({ length: Math.min(5, data?.pageCount ?? 1) }, (_, index) => firstPage + index);
  const display = (field: string, value: string, row: Doc<"activity">, side: "before" | "after") => {
    if (!value) return "—";
    if (["checkIn", "checkOut", "from", "to", "dateFrom", "dateTo"].includes(field) && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value, locale);
    if (field.endsWith("Thb") && Number.isFinite(Number(value))) return formatThb(Number(value), locale);
    if (field === "commissionValue" || field === "discountValue") {
      const mode = row.changes.find(change => change.field === (field === "discountValue" ? "discountMode" : "commissionMode"))?.[side];
      if (mode === "percentage") return `${value}%`;
      if (mode === "amount") return formatThb(Number(value), locale);
    }
    if (field === "sortOrder" && Number.isFinite(Number(value))) return String(Number(value) + 1);
    if (field === "daysOfWeek") {
      const days = locale === "th" ? ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      try { return (JSON.parse(value) as number[]).map(day => days[day]).join(", ") || "—"; } catch { return value; }
    }
    return ["reason", "role", "accountMode", "status", "active", "archived", "isDefault", "commissionMode", "discountMode"].includes(field) && values[value] ? t(values[value]) : value;
  };
  return <section className="min-w-0" aria-labelledby="activity-heading">
    <h2 id="activity-heading" ref={heading} tabIndex={-1} className="mb-3 scroll-mt-20 text-base font-semibold outline-none">{t({ en: "Activity", th: "กิจกรรม" })}</h2>
    {!data && <Skeleton className="h-24" />}
    {data && !data.page.length && <p className="py-6 text-sm text-muted-foreground">{t({ en: "No activity yet.", th: "ยังไม่มีกิจกรรม" })}</p>}
    <ul className="divide-y">{(data?.page as Doc<"activity">[] | undefined)?.map(row => {
      const entity = locale === "en" ? entities[row.entity].en.toLowerCase() : t(entities[row.entity]);
      const action = row.action === "created" ? t({ en: "New", th: "สร้าง" }) : row.action === "cancelled" ? t({ en: "Cancelled", th: "ยกเลิก" }) : row.action === "deleted" ? t({ en: "Deleted", th: "ลบ" }) : t({ en: "Updated", th: "แก้ไข" });
      const title = `${action} ${entity}${row.villaName ? ` · ${row.villaName}` : ""}`;
      const primary = row.entity === "bookings" ? ["guestName", "checkIn", "checkOut"] : row.entity === "closedDates" ? ["from", "to"] : row.entity === "pricingPresets" ? ["name", "daysOfWeek", "dateFrom", "dateTo"] : row.entity === "operationsUsers" ? ["name"] : row.entity === "villaInvitations" ? ["email", "role"] : row.entity === "villaAssignments" ? ["userId", "email", "role"] : [];
      const useful = row.changes.filter(change => change.before || change.after);
      const context = useful.filter(change => primary.includes(change.field));
      const details = useful.filter(change => !primary.includes(change.field)).sort((a, b) => Number(b.before !== b.after) - Number(a.before !== a.after));
      const renderValue = (change: Doc<"activity">["changes"][number]) => {
        if (row.action === "created") return display(change.field, change.after, row, "after");
        if (row.action === "deleted") return display(change.field, change.before, row, "before");
        if (change.before === change.after) return display(change.field, change.after, row, "after");
        return <>{display(change.field, change.before, row, "before")} → {display(change.field, change.after, row, "after")}</>;
      };
      const renderField = (change: Doc<"activity">["changes"][number]) => <div key={change.field} className="grid grid-cols-[6rem_1fr] gap-2"><dt className="text-muted-foreground">{t(fields[change.field])}</dt><dd className="min-w-0 break-words whitespace-pre-wrap">{renderValue(change)}</dd></div>;
      return <li key={row._id} className="py-3">
        <p className="text-sm font-medium">{title}</p>
        {context.length > 0 && <dl className="mt-2 grid gap-1 text-xs">{context.map(renderField)}</dl>}
        <p className="mt-1 text-xs text-muted-foreground">{t({ en: "by", th: "โดย" })} {row.actorName} · <time dateTime={new Date(row.createdAt).toISOString()}>{new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(row.createdAt)}</time></p>
        {details.length > 0 && <details className="mt-2 text-xs"><summary className="w-fit cursor-pointer text-muted-foreground">{t({ en: "View details", th: "ดูรายละเอียด" })}</summary><dl className="mt-2 grid gap-1.5">{details.map(renderField)}</dl></details>}
      </li>;
    })}</ul>
    {data && data.pageCount > 1 && <nav className="mt-4 flex items-center justify-center gap-1.5" aria-label={t({ en: "Activity pages", th: "หน้ารายการกิจกรรม" })}>
      <Button type="button" variant="outline" size="icon-sm" className="size-8 rounded-sm" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)} aria-label={t({ en: "Previous page", th: "หน้าก่อนหน้า" })}><ChevronLeft /></Button>
      {pageNumbers.map(number => <Button key={number} type="button" variant={number === currentPage ? "default" : "outline"} size="icon-sm" className="size-8 rounded-sm text-xs" aria-current={number === currentPage ? "page" : undefined} aria-label={t({ en: `Page ${number}`, th: `หน้า ${number}` })} onClick={() => changePage(number)}>{number}</Button>)}
      <Button type="button" variant="outline" size="icon-sm" className="size-8 rounded-sm" disabled={currentPage === data.pageCount} onClick={() => changePage(currentPage + 1)} aria-label={t({ en: "Next page", th: "หน้าถัดไป" })}><ChevronRight /></Button>
    </nav>}
  </section>;
}
