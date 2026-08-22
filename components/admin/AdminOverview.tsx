"use client";

import { useQuery } from "convex/react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { formatNumericDateRange } from "@/lib/date-format";
import {
  AdminButton,
  AdminEmptyState,
  AdminField,
  AdminNotice,
  AdminPanel,
  AdminPanelHeader,
  AdminSkeleton,
  AdminStatusBadge,
  AdminTideLine,
} from "./AdminUI";
import { useAdminLocale } from "./AdminLocale";
import { adminRoutes, type AdminView } from "./admin-routes";

export function AdminOverview() {
  const { locale, copy } = useAdminLocale();
  const router = useRouter();
  const navigate = (view: AdminView) => router.push(adminRoutes[view]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const dateError = Boolean(from && to && from > to);
  const data = useQuery(api.adminDashboard.overview);
  const report = useQuery(api.adminDashboard.inquiryReport, dateError ? "skip" : { from: from || undefined, to: to || undefined });

  if (data === undefined || (!dateError && report === undefined)) return <OverviewSkeleton />;

  const newRequests = data.requests.filter((item) => item.status === "new");
  const notificationIssues = data.notificationHealth.filter((item) => item.status === "unhealthy").length;
  const missingCalendars = data.villas.filter((villa) => villa.status === "published" && !villa.googleCalendarId).length;
  const attention = notificationIssues + missingCalendars;
  const published = data.villas.filter((villa) => villa.status === "published").length;
  const attentionItems = [
    { label: copy("New inquiries to review", "คำขอจองใหม่ที่ต้องตรวจสอบ"), count: newRequests.length, view: "inquiries", detail: copy("Contact guests and mark requests viewed.", "ติดต่อผู้เข้าพักและทำเครื่องหมายว่าดูแล้ว") },
    { label: copy("Notification channels", "ช่องทางการแจ้งเตือน"), count: notificationIssues, view: "integrations", detail: copy("The latest email or LINE attempt failed.", "การส่งอีเมลหรือ LINE ครั้งล่าสุดล้มเหลว") },
    { label: copy("Published villas missing calendars", "วิลล่าที่เผยแพร่แต่ยังไม่มีปฏิทิน"), count: missingCalendars, view: "villas", detail: copy("Connect a Google Calendar in villa details.", "เชื่อมต่อ Google ปฏิทินในรายละเอียดวิลล่า") },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-6">
      <AdminTideLine
        items={[
          { label: copy("New inquiries", "คำขอจองใหม่"), value: newRequests.length, tone: newRequests.length ? "attention" : "healthy", onClick: () => navigate("inquiries") },
          { label: copy("Operational issues", "ปัญหาการดำเนินงาน"), value: attention, tone: attention ? "attention" : "healthy", onClick: () => navigate("integrations") },
          { label: copy(`${published} of ${data.villas.length} villas published`, `เผยแพร่ ${published} จาก ${data.villas.length} วิลล่า`), value: data.villas.length, tone: "context", onClick: () => navigate("villas") },
        ]}
      />

      {attentionItems.length ? (
        <AdminPanel>
          <AdminPanelHeader title={copy("Needs attention", "ต้องตรวจสอบ")} detail={copy("Start with an exception; each item opens the place where it can be resolved.", "เริ่มจากรายการผิดปกติ แต่ละรายการจะเปิดหน้าที่ใช้แก้ไขได้")} />
          <div className="divide-y divide-[#ece7df]">
            {attentionItems.map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.view as AdminView)} className="grid min-h-16 w-full gap-1 px-4 py-3 text-left transition hover:bg-[#faf8f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c66f4e] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4 sm:px-5">
                <span className="font-price text-xl font-semibold text-[#c66f4e]">{item.count}</span>
                <span><strong className="block text-sm text-[#001e33]">{item.label}</strong><span className="mt-0.5 block text-xs text-[#68777a]">{item.detail}</span></span>
                <ArrowRight size={15} className="hidden text-[#0f6474] sm:block" />
              </button>
            ))}
          </div>
        </AdminPanel>
      ) : (
        <AdminNotice tone="success" title={copy("Nothing urgent", "ไม่มีเรื่องเร่งด่วน")}>
          {copy("No new inquiries, delivery failures, or missing calendar connections need attention.", "ไม่มีคำขอจองใหม่ การส่งล้มเหลว หรือการเชื่อมต่อปฏิทินที่ต้องดำเนินการ")}
        </AdminNotice>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminPanel>
          <AdminPanelHeader
            title={copy("Latest inquiries", "คำขอจองล่าสุด")}
            detail={copy("Guest contact, requested stay, and estimated value", "ข้อมูลติดต่อ ช่วงเข้าพัก และมูลค่าโดยประมาณ")}
            action={<AdminButton variant="quiet" onClick={() => navigate("inquiries")} className="min-h-9 px-2">{copy("View all", "ดูทั้งหมด")} <ArrowRight size={14} /></AdminButton>}
          />
          {data.requests.length === 0 ? (
            <AdminEmptyState title={copy("No inquiries yet", "ยังไม่มีคำขอจอง")} detail={copy("New booking requests will appear here as soon as a guest sends one.", "คำขอจองใหม่จะแสดงที่นี่เมื่อผู้เข้าพักส่งคำขอ")} action={<AdminButton onClick={() => navigate("villas")}>{copy("Review public villas", "ตรวจสอบวิลล่าบนเว็บไซต์")}</AdminButton>} />
          ) : (
            <div className="divide-y divide-[#ece7df]">
              {data.requests.slice(0, 6).map((request) => {
                const villa = data.villas.find((item) => item._id === request.villaId);
                return (
                  <button key={request._id} type="button" onClick={() => navigate("inquiries")} className="grid w-full gap-2 px-4 py-3 text-left transition hover:bg-[#faf8f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c66f4e] sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#001e33]">{villa ? (locale === "th" ? villa.nameTh : villa.nameEn) : copy("Unknown villa", "ไม่ทราบวิลล่า")}</span><span className="mt-1 block text-xs text-[#68777a]">{formatNumericDateRange(request.checkIn, request.checkOut)} · {request.guestCount ?? copy("N/A", "ไม่มีข้อมูล")}</span></span>
                    <span className="flex items-center justify-between gap-3 sm:justify-end"><AdminStatusBadge tone="warning">{copy("new", "ใหม่")}</AdminStatusBadge><strong className="font-price text-sm text-[#163038]">฿{request.estimatedTotalThb.toLocaleString()}</strong></span>
                  </button>
                );
              })}
            </div>
          )}
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title={copy("Integration health", "สถานะการเชื่อมต่อ")} detail={copy("Delivery and calendar trust signals", "สถานะการส่งและความน่าเชื่อถือของปฏิทิน")} />
          <div className="divide-y divide-[#ece7df]">
            <HealthRow label={copy("Email delivery", "การส่งอีเมล")} status={data.notificationHealth.find((item) => item.channel === "email")?.status ?? "not_tested"} />
            <HealthRow label={copy("LINE delivery", "การส่ง LINE")} status={data.notificationHealth.find((item) => item.channel === "line")?.status ?? "not_tested"} />
            <HealthRow label={copy("Missing villa calendars", "วิลล่าที่ยังไม่มีปฏิทิน")} value={missingCalendars} />
          </div>
          <AdminButton variant="quiet" onClick={() => navigate("integrations")} className="w-full border-t border-x-0 border-b-0 border-[#e8e2d8]"><RefreshCw size={14} /> {copy("Open integrations", "เปิดการเชื่อมต่อ")}</AdminButton>
        </AdminPanel>
      </section>

      <AdminPanel>
        <AdminPanelHeader
          title={copy("Inquiry performance", "ผลการดำเนินงานของคำขอจอง")}
          detail={copy("Villas ranked by inquiry count in the selected date range", "จัดอันดับวิลล่าตามจำนวนคำขอในช่วงวันที่ที่เลือก")}
          action={<div className="flex items-end gap-2"><AdminField label={copy("From", "จาก")} type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-[145px]" /><AdminField label={copy("To", "ถึง")} type="date" value={to} onChange={(event) => setTo(event.target.value)} error={dateError ? copy("Must be after From", "ต้องไม่ก่อนวันที่เริ่มต้น") : undefined} className="w-[145px]" />{from || to ? <AdminButton variant="quiet" className="mb-0 min-h-11 px-2" onClick={() => { setFrom(""); setTo(""); }}>{copy("Reset", "รีเซ็ต")}</AdminButton> : null}</div>}
        />
        {dateError ? (
          <AdminNotice tone="error" className="m-4" title={copy("Check the date range", "ตรวจสอบช่วงวันที่")}>{copy("The “To” date must be the same as or later than the “From” date.", "วันที่สิ้นสุดต้องตรงกับหรืออยู่หลังวันที่เริ่มต้น")}</AdminNotice>
        ) : report?.length === 0 ? (
          <AdminEmptyState title={copy("No reporting data in this range", "ไม่มีข้อมูลรายงานในช่วงนี้")} detail={copy("Try resetting the dates, or wait for the first matching inquiry.", "ลองรีเซ็ตวันที่หรือรอคำขอจองแรกที่ตรงกับช่วงนี้")} action={(from || to) ? <AdminButton variant="secondary" onClick={() => { setFrom(""); setTo(""); }}>{copy("Reset dates", "รีเซ็ตวันที่")}</AdminButton> : undefined} />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-[#f7f4ee] text-[10px] uppercase tracking-wider text-[#68777a]"><tr><th className="px-5 py-3">{copy("Villa", "วิลล่า")}</th><th className="px-5 py-3 text-right">{copy("Inquiries", "คำขอ")}</th></tr></thead>
                <tbody className="divide-y divide-[#ece7df]">{report?.map((item) => <tr key={item.villaId}><td className="px-5 py-3 font-semibold text-[#001e33]">{item.villa ? (locale === "th" ? item.villa.nameTh : item.villa.nameEn) : copy("Unknown villa", "ไม่ทราบวิลล่า")}</td><td className="px-5 py-3 text-right font-semibold">{item.count}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="divide-y divide-[#ece7df] sm:hidden">{report?.map((item) => <div key={item.villaId} className="p-4"><p className="font-semibold text-[#001e33]">{item.villa ? (locale === "th" ? item.villa.nameTh : item.villa.nameEn) : copy("Unknown villa", "ไม่ทราบวิลล่า")}</p><p className="mt-1 text-xs text-[#68777a]">{copy(`${item.count} inquir${item.count === 1 ? "y" : "ies"}`, `${item.count} คำขอ`)}</p></div>)}</div>
          </>
        )}
      </AdminPanel>
    </div>
  );
}

function HealthRow({ label, value, text, status }: { label: string; value?: number; text?: string; status?: "healthy" | "unhealthy" | "checking" | "not_tested" }) {
  const { copy } = useAdminLocale();
  const hasIssue = Boolean(value);
  const operationalBadge = status === "healthy"
    ? <AdminStatusBadge tone="success">{copy("Healthy", "ปกติ")}</AdminStatusBadge>
    : status === "unhealthy"
      ? <AdminStatusBadge tone="danger">{copy("Issue", "มีปัญหา")}</AdminStatusBadge>
      : status === "checking"
        ? <AdminStatusBadge tone="info">{copy("Sending", "กำลังส่ง")}</AdminStatusBadge>
        : <AdminStatusBadge tone="neutral">{copy("Not tested", "ยังไม่ได้ทดสอบ")}</AdminStatusBadge>;
  return <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs"><span className="text-[#68777a]">{label}</span>{text ? <strong className="capitalize text-[#001e33]">{text}</strong> : status ? operationalBadge : <AdminStatusBadge tone={hasIssue ? "warning" : "success"}>{hasIssue ? copy(`${value} issue${value === 1 ? "" : "s"}`, `${value} ปัญหา`) : copy("Healthy", "ปกติ")}</AdminStatusBadge>}</div>;
}

function OverviewSkeleton() {
  return <div className="space-y-6"><AdminSkeleton rows={1} className="border border-[#ddd6ca]" /><div className="grid gap-6 xl:grid-cols-[1fr_360px]"><AdminSkeleton rows={4} className="border border-[#ddd6ca]" /><AdminSkeleton rows={4} className="border border-[#ddd6ca]" /></div><AdminSkeleton rows={3} className="border border-[#ddd6ca]" /></div>;
}
