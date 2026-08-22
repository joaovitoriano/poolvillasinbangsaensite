"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { ChevronDown, RefreshCw, Save, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { formatNumericDateTime } from "@/lib/date-format";
import {
  AdminButton,
  AdminEmptyState,
  AdminField,
  AdminNotice,
  AdminToast,
  AdminPanel,
  AdminPanelHeader,
  AdminSelect,
  AdminSkeleton,
  AdminStatusBadge,
  AdminTextarea,
} from "./AdminUI";
import { translateChangedSettingsContent } from "./settings-translation";
import { useAdminLocale } from "./AdminLocale";
import { translatedInputValue } from "./translated-input";

export function AdminSuperadmin({ view, role }: { view: string; role: "admin" | "superadmin" }) {
  const { copy } = useAdminLocale();
  if (role !== "superadmin") return <AdminEmptyState className="border border-[#ddd6ca] bg-white" title={copy("Superadmin access required", "ต้องมีสิทธิ์ผู้ดูแลระบบขั้นสูง")} detail={copy("This workspace view changes shared access or configuration. Ask a superadmin to make the change.", "มุมมองนี้ใช้เปลี่ยนสิทธิ์หรือการตั้งค่าร่วม โปรดขอให้ผู้ดูแลระบบขั้นสูงดำเนินการ")} />;
  if (view === "settings") return <SettingsPanel mode="business" />;
  if (view === "seo") return <SeoPanel />;
  if (view === "integrations") return <IntegrationsPanel />;
  return <AuditPanel />;
}

function SettingsPanel({ mode }: { mode: "business" | "seo" }) {
  const { copy } = useAdminLocale();
  const settings = useQuery(api.settings.getAdmin);
  const update = useMutation(api.settings.updateChanges);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (settings === undefined) return <AdminSkeleton rows={5} className="border border-[#ddd6ca]" />;
  if (!settings) return <AdminEmptyState className="border border-[#ddd6ca] bg-white" title={copy("Settings are not initialized", "ยังไม่ได้เริ่มต้นการตั้งค่า")} detail={copy("Run the initial settings setup before editing.", "เริ่มต้นการตั้งค่าก่อนแก้ไข")} />;
  const currentSettings = settings;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setMessage(null);
    try {
      const changes: FunctionArgs<typeof api.settings.updateChanges> = {};
      if (mode === "business") {
        const businessName = String(data.get("businessName")).trim();
        const phone = String(data.get("phone")).trim();
        const lineId = String(data.get("lineId")).trim();
        if (businessName !== currentSettings.businessName) changes.businessName = businessName;
        if (phone !== currentSettings.phone) changes.phone = phone;
        if (lineId !== currentSettings.lineId) changes.lineId = lineId;
      } else {
        const bilingual = await translateChangedSettingsContent({
          title: { source: String(data.get("defaultSeoTitleSource")), previousSource: currentSettings.defaultSeoTitleSource ?? currentSettings.defaultSeoTitleEn, english: currentSettings.defaultSeoTitleEn, thai: currentSettings.defaultSeoTitleTh },
          description: { source: String(data.get("defaultSeoDescriptionSource")), previousSource: currentSettings.defaultSeoDescriptionSource ?? currentSettings.defaultSeoDescriptionEn, english: currentSettings.defaultSeoDescriptionEn, thai: currentSettings.defaultSeoDescriptionTh },
        });
        if (bilingual.title.source !== (currentSettings.defaultSeoTitleSource ?? currentSettings.defaultSeoTitleEn)) Object.assign(changes, { defaultSeoTitleSource: bilingual.title.source, defaultSeoTitleEn: bilingual.title.english, defaultSeoTitleTh: bilingual.title.thai });
        if (bilingual.description.source !== (currentSettings.defaultSeoDescriptionSource ?? currentSettings.defaultSeoDescriptionEn)) Object.assign(changes, { defaultSeoDescriptionSource: bilingual.description.source, defaultSeoDescriptionEn: bilingual.description.english, defaultSeoDescriptionTh: bilingual.description.thai });
      }
      if (Object.keys(changes).length) await update(changes);
      setMessage({ tone: "success", text: copy("Settings saved.", "บันทึกการตั้งค่าแล้ว") });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : copy("Settings could not be saved.", "ไม่สามารถบันทึกการตั้งค่าได้") });
    } finally { setBusy(false); }
  }
  return <div className="space-y-4">{message ? <AdminToast tone={message.tone}>{message.text}</AdminToast> : null}<form onSubmit={submit}><AdminPanel><AdminPanelHeader title={mode === "business" ? copy("Public business details", "ข้อมูลธุรกิจสาธารณะ") : copy("Search defaults", "ค่าเริ่มต้นสำหรับการค้นหา")} />{mode === "business" ? <div className="grid gap-4 p-4 sm:p-5"><AdminField name="businessName" label={copy("Business name", "ชื่อธุรกิจ")} defaultValue={currentSettings.businessName} required /><AdminField name="phone" label={copy("Phone", "โทรศัพท์")} defaultValue={currentSettings.phone} required /><AdminField name="lineId" label="LINE ID" defaultValue={currentSettings.lineId} required /></div> : <div className="grid gap-5 p-4 sm:p-5"><LocalizedSettingsField name="defaultSeoTitleSource" label={copy("Default SEO title", "ชื่อ SEO เริ่มต้น")} english={currentSettings.defaultSeoTitleEn} thai={currentSettings.defaultSeoTitleTh} source={currentSettings.defaultSeoTitleSource ?? currentSettings.defaultSeoTitleEn} /><LocalizedSettingsField multiline name="defaultSeoDescriptionSource" label={copy("Default SEO description", "คำอธิบาย SEO เริ่มต้น")} english={currentSettings.defaultSeoDescriptionEn} thai={currentSettings.defaultSeoDescriptionTh} source={currentSettings.defaultSeoDescriptionSource ?? currentSettings.defaultSeoDescriptionEn} /></div>}<div className="flex justify-end border-t border-[#e8e2d8] p-4"><AdminButton type="submit" busy={busy} busyLabel={copy("Saving…", "กำลังบันทึก…")}><Save size={15} /> {copy("Save settings", "บันทึกการตั้งค่า")}</AdminButton></div></AdminPanel></form></div>;
}

function LocalizedSettingsField({ name, label, english, thai, source, guide, multiline = false }: { name: string; label: string; english: string; thai: string; source: string; guide?: number; multiline?: boolean }) {
  const { locale, copy } = useAdminLocale();
  const [values, setValues] = useState({ english, thai, source });
  useEffect(() => setValues({ english, thai, source }), [english, thai, source]);
  const value = translatedInputValue(locale, values.english, values.thai);
  const helper = guide ? copy(`${value.length} characters · around ${guide} is a useful search-result guide, not a hard limit.`, `${value.length} ตัวอักษร · ประมาณ ${guide} ตัวเป็นแนวทางที่เหมาะสมสำหรับผลการค้นหา ไม่ใช่ข้อจำกัดตายตัว`) : undefined;
  const change = (next: string) => setValues((current) => ({ ...current, source: next, [locale === "th" ? "thai" : "english"]: next }));
  return <><input type="hidden" name={name} value={values.source} />{multiline ? <AdminTextarea label={label} value={value} sourceText={values.source} onChange={(event) => change(event.target.value)} helper={helper} optional /> : <AdminField label={label} value={value} sourceText={values.source} onChange={(event) => change(event.target.value)} helper={helper} optional />}</>;
}

function SeoPanel() {
  return <SettingsPanel mode="seo" />;
}

function IntegrationsPanel() {
  const { locale, copy } = useAdminLocale();
  const data = useQuery(api.adminDashboard.overview);
  const settings = useQuery(api.settings.getAdmin);
  const updateSettings = useMutation(api.settings.updateChanges);
  const testLine = useAction(api.notifications.testLine);
  const testEmail = useAction(api.notifications.testEmail);
  const syncNow = useAction(api.googleCalendar.syncNow);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [integrationBusy, setIntegrationBusy] = useState(false);
  const [integrationDirty, setIntegrationDirty] = useState(false);
  const [integrationFormKey, setIntegrationFormKey] = useState(0);
  const [lineTestBusy, setLineTestBusy] = useState(false);
  const [lineTestResult, setLineTestResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [emailTestBusy, setEmailTestBusy] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  if (data === undefined || settings === undefined) return <AdminSkeleton rows={6} className="border border-[#ddd6ca]" />;
  if (!settings) return <AdminEmptyState className="border border-[#ddd6ca] bg-white" title={copy("Settings are not initialized", "ยังไม่ได้เริ่มต้นการตั้งค่า")} detail={copy("Run the project’s initial seed before editing integration configuration.", "เรียกใช้ข้อมูลเริ่มต้นของโปรเจกต์ก่อนแก้ไขการตั้งค่าการเชื่อมต่อ")} />;
  const currentSettings = settings;
  const missingCalendarVillas = data.villas.filter((villa) => villa.status === "published" && !villa.googleCalendarId);
  const connectedVillas = data.villas.filter((villa) => villa.status !== "archived" && villa.googleCalendarId);
  const calendarConnectionIssues = connectedVillas.filter((villa) => {
    const connection = data.calendarConnections.find((item) => item.villaId === villa._id && item.calendarId === villa.googleCalendarId);
    return !connection || connection.status !== "active";
  }).length;
  async function run() { setSyncing(true); setMessage(null); try { const result = await syncNow(); setMessage({ tone: result.skipped ? "info" : "success", text: result.skipped ? copy("Synchronization is disabled in Integrations.", "ปิดการซิงค์ไว้ในการเชื่อมต่อ") : copy(`Sync finished: ${result.calendarsProcessed ?? 0} calendars and ${result.importedEvents ?? 0} imported events. Google Calendar was not changed.`, `ซิงค์เสร็จแล้ว: ${result.calendarsProcessed ?? 0} ปฏิทิน และนำเข้า ${result.importedEvents ?? 0} เหตุการณ์ โดยไม่มีการเปลี่ยนแปลง Google ปฏิทิน`) }); } catch { setMessage({ tone: "error", text: copy("Calendar synchronization failed.", "การซิงค์ปฏิทินล้มเหลว") }); } finally { setSyncing(false); } }
  async function saveIntegrationSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const notificationEmails = String(data.get("notificationEmails")).split(",").map((item) => item.trim()).filter(Boolean);
    const invalid = notificationEmails.filter((email) => !/^\S+@\S+\.\S+$/.test(email));
    if (invalid.length) { setMessage({ tone: "error", text: copy(`Check notification recipient${invalid.length === 1 ? "" : "s"}: ${invalid.join(", ")}.`, `ตรวจสอบอีเมลผู้รับการแจ้งเตือน: ${invalid.join(", ")}`) }); return; }
    const lineNotificationUserId = String(data.get("lineNotificationUserId")).trim();
    const notificationLanguage = String(data.get("notificationLanguage")) as "en" | "th";
    const changes: FunctionArgs<typeof api.settings.updateChanges> = {};
    if (notificationEmails.length !== currentSettings.notificationEmails.length || notificationEmails.some((value, index) => value !== currentSettings.notificationEmails[index])) changes.notificationEmails = notificationEmails;
    if (lineNotificationUserId !== (currentSettings.lineNotificationUserId ?? "")) changes.lineNotificationUserId = lineNotificationUserId || null;
    if (notificationLanguage !== currentSettings.notificationLanguage) changes.notificationLanguage = notificationLanguage;
    setIntegrationBusy(true); setMessage(null);
    try {
      if (Object.keys(changes).length) await updateSettings(changes);
      setIntegrationDirty(false); setMessage({ tone: "success", text: copy("Integration settings saved.", "บันทึกการตั้งค่าการเชื่อมต่อแล้ว") });
    } catch { setMessage({ tone: "error", text: copy("Could not save integration settings.", "ไม่สามารถบันทึกการตั้งค่าการเชื่อมต่อได้") }); }
    finally { setIntegrationBusy(false); }
  }
  function resetIntegrationSettings() { setIntegrationFormKey((value) => value + 1); setIntegrationDirty(false); setMessage(null); }
  async function sendLineTest() {
    setLineTestBusy(true); setLineTestResult(null);
    try {
      await testLine({});
      setLineTestResult({ tone: "success", text: copy("LINE accepted the test message. Check the recipient’s LINE chat to confirm delivery.", "LINE รับข้อความทดสอบแล้ว โปรดตรวจสอบแชท LINE ของผู้รับเพื่อยืนยันการส่ง") });
    } catch (error) {
      setLineTestResult({ tone: "error", text: locale === "en" && error instanceof Error ? error.message : copy("The LINE test message could not be sent. Check the saved recipient ID and channel access token.", "ไม่สามารถส่งข้อความทดสอบ LINE ได้ โปรดตรวจสอบรหัสผู้รับที่บันทึกไว้และโทเค็นการเข้าถึงช่อง") });
    } finally { setLineTestBusy(false); }
  }
  async function sendEmailTest() {
    setEmailTestBusy(true); setEmailTestResult(null);
    try {
      await testEmail({});
      setEmailTestResult({ tone: "success", text: copy("Resend accepted the test email. Check the recipients’ inboxes to confirm delivery.", "Resend รับอีเมลทดสอบแล้ว โปรดตรวจสอบกล่องจดหมายของผู้รับเพื่อยืนยันการส่ง") });
    } catch (error) {
      setEmailTestResult({ tone: "error", text: locale === "en" && error instanceof Error ? error.message : copy("The email test could not be sent. Check the recipients, sender address, and Resend API key.", "ไม่สามารถส่งอีเมลทดสอบได้ โปรดตรวจสอบผู้รับ ที่อยู่อีเมลผู้ส่ง และ API key ของ Resend") });
    } finally { setEmailTestBusy(false); }
  }
  return <div className="space-y-5">
    {message ? <AdminToast tone={message.tone}>{message.text}</AdminToast> : null}
    <div className="flex justify-end"><AdminButton busy={syncing} busyLabel={copy("Synchronizing…", "กำลังซิงค์…")} onClick={() => void run()}><RefreshCw size={15} /> {copy("Synchronize now", "ซิงค์ตอนนี้")}</AdminButton></div>
    <form key={integrationFormKey} onSubmit={saveIntegrationSettings} onChange={() => { setIntegrationDirty(true); setLineTestResult(null); setEmailTestResult(null); }} className="space-y-3">
      <AdminPanel>
        <AdminPanelHeader title={copy("Notification recipients", "ผู้รับการแจ้งเตือน")} detail={copy("New booking-request messages are sent to these destinations.", "ข้อความคำขอจองใหม่จะถูกส่งไปยังปลายทางเหล่านี้")} />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="max-w-[240px]">
            <AdminSelect name="notificationLanguage" label={copy("Notification language", "ภาษาการแจ้งเตือน")} defaultValue={settings.notificationLanguage}><option value="en">{copy("English", "อังกฤษ")}</option><option value="th">{copy("Thai", "ไทย")}</option></AdminSelect>
          </div>
          <div className="space-y-3">
            <AdminField name="notificationEmails" label={copy("Notification email addresses", "อีเมลรับการแจ้งเตือน")} defaultValue={settings.notificationEmails.join(", ")} helper={copy(`${settings.notificationEmails.length} recipient${settings.notificationEmails.length === 1 ? "" : "s"} currently saved. Separate addresses with commas.`, `บันทึกผู้รับไว้ ${settings.notificationEmails.length} ราย คั่นอีเมลด้วยเครื่องหมายจุลภาค`)} optional />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <AdminButton type="button" variant="secondary" busy={emailTestBusy} busyLabel={copy("Sending test…", "กำลังส่งอีเมลทดสอบ…")} disabled={integrationDirty || !settings.notificationEmails.length} onClick={() => void sendEmailTest()}><Send size={15} /> {copy("Send email test", "ส่งอีเมลทดสอบ")}</AdminButton>
              {integrationDirty ? <p className="text-xs text-[#68777a]">{copy("Save changes before testing.", "บันทึกการเปลี่ยนแปลงก่อนทดสอบ")}</p> : null}
            </div>
            {emailTestResult ? <AdminNotice tone={emailTestResult.tone}>{emailTestResult.text}</AdminNotice> : null}
          </div>
          <section className="space-y-3 border-t border-[#e8e2d8] pt-4" aria-labelledby="line-notification-heading">
            <h3 id="line-notification-heading" className="text-xs font-semibold text-[#001e33]">{copy("LINE notifications", "การแจ้งเตือน LINE")}</h3>
            <AdminField name="lineNotificationUserId" label={copy("LINE notification recipient user ID", "รหัสผู้ใช้ผู้รับการแจ้งเตือน LINE")} defaultValue={settings.lineNotificationUserId ?? ""} optional helper={copy("This recipient ID is stored here; the Messaging API token remains a secure deployment secret and is never displayed.", "รหัสผู้รับนี้จะถูกจัดเก็บที่นี่ ส่วนโทเค็น Messaging API ยังคงเป็นความลับของระบบและจะไม่แสดงผล")} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><AdminButton type="button" variant="secondary" busy={lineTestBusy} busyLabel={copy("Sending test…", "กำลังส่งข้อความทดสอบ…")} disabled={integrationDirty || !settings.lineNotificationUserId?.trim()} onClick={() => void sendLineTest()}><Send size={15} /> {copy("Send LINE test", "ส่งข้อความทดสอบ LINE")}</AdminButton>{integrationDirty ? <p className="text-xs text-[#68777a]">{copy("Save changes before testing.", "บันทึกการเปลี่ยนแปลงก่อนทดสอบ")}</p> : null}</div>
            {lineTestResult ? <AdminNotice tone={lineTestResult.tone}>{lineTestResult.text}</AdminNotice> : null}
          </section>
        </div>
      </AdminPanel>
      {integrationDirty || integrationBusy ? <div className="sticky bottom-3 flex items-center justify-between gap-2 rounded-2xl border border-[#ddd6ca] bg-white/95 p-3 shadow-[0_8px_24px_rgba(0,30,51,.08)] backdrop-blur"><p className="hidden text-xs text-[#68777a] sm:block">{copy("You have unsaved changes.", "คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก")}</p><div className="ml-auto flex justify-end gap-2"><AdminButton type="button" variant="quiet" onClick={resetIntegrationSettings} disabled={integrationBusy}>{copy("Reset", "รีเซ็ต")}</AdminButton><AdminButton type="submit" busy={integrationBusy} busyLabel={copy("Saving settings…", "กำลังบันทึกการตั้งค่า…")}><Save size={15} /> {copy("Save settings", "บันทึกการตั้งค่า")}</AdminButton></div></div> : null}
    </form>
    <AdminPanel><AdminPanelHeader title={copy("Connection health", "สถานะการเชื่อมต่อ")} detail={copy("Current status from the latest completed attempt", "สถานะปัจจุบันจากการส่งครั้งล่าสุดที่เสร็จสิ้น")} /><div className="divide-y divide-[#ece7df]"><NotificationHealthRow name={copy("Email notifications", "การแจ้งเตือนอีเมล")} health={data.notificationHealth.find((item) => item.channel === "email")} /><NotificationHealthRow name={copy("LINE notifications", "การแจ้งเตือน LINE")} health={data.notificationHealth.find((item) => item.channel === "line")} /><IntegrationRow name={copy("Google Calendar sync", "การซิงค์ Google Calendar")} issues={calendarConnectionIssues} impact={copy("Calendar changes may not reach public availability.", "การเปลี่ยนแปลงในปฏิทินอาจไม่ไปถึงสถานะว่างสาธารณะ")} next={copy("Review each villa connection below and use Synchronize now after correcting an error.", "ตรวจสอบการเชื่อมต่อของแต่ละวิลล่าด้านล่าง และใช้ปุ่มซิงค์ตอนนี้หลังแก้ไขข้อผิดพลาด")} /><MissingCalendarAccordion villas={missingCalendarVillas} /></div></AdminPanel>
  </div>;
}
function IntegrationRow({ name, issues, impact, next }: { name: string; issues: number; impact: string; next: React.ReactNode }) { const { copy } = useAdminLocale(); return <div className="grid gap-2 p-4 sm:grid-cols-[190px_110px_minmax(0,1fr)] sm:items-center sm:gap-x-8 sm:p-5"><h3 className="text-sm font-semibold text-[#001e33]">{name}</h3><AdminStatusBadge tone={issues ? "warning" : "success"} className="w-fit">{issues ? copy(`${issues} issue${issues === 1 ? "" : "s"}`, `${issues} ปัญหา`) : copy("Healthy", "ปกติ")}</AdminStatusBadge><div className="text-xs leading-5 text-[#68777a]"><p>{impact}</p><p className="mt-1">{next}</p></div></div>; }

type DashboardOverview = FunctionReturnType<typeof api.adminDashboard.overview>;
type DashboardVilla = DashboardOverview["villas"][number];
type NotificationHealth = DashboardOverview["notificationHealth"][number];

function NotificationHealthRow({ name, health }: { name: string; health?: NotificationHealth }) {
  const { copy } = useAdminLocale();
  const status = health?.status ?? "not_tested";
  const badge = status === "healthy"
    ? { tone: "success" as const, label: copy("Healthy", "ปกติ") }
    : status === "unhealthy"
      ? { tone: "danger" as const, label: copy("Issue", "มีปัญหา") }
      : status === "checking"
        ? { tone: "info" as const, label: copy("Sending", "กำลังส่ง") }
        : { tone: "neutral" as const, label: copy("Not tested", "ยังไม่ได้ทดสอบ") };
  const summary = status === "healthy"
    ? copy("The latest message was accepted for delivery.", "ข้อความล่าสุดได้รับการยอมรับเพื่อจัดส่งแล้ว")
    : status === "unhealthy"
      ? copy("The latest message could not be sent.", "ไม่สามารถส่งข้อความล่าสุดได้")
      : status === "checking"
        ? copy("The latest message is still being sent.", "ระบบกำลังส่งข้อความล่าสุด")
        : copy("No completed delivery or test has been recorded.", "ยังไม่มีบันทึกการส่งหรือการทดสอบที่เสร็จสิ้น");
  const detail = health?.checkedAt
    ? copy(`Last checked ${formatNumericDateTime(health.checkedAt)}.`, `ตรวจสอบล่าสุด ${formatNumericDateTime(health.checkedAt)}`)
    : copy("Send a test to confirm this channel.", "ส่งข้อความทดสอบเพื่อยืนยันช่องทางนี้");
  return <div className="grid gap-2 p-4 sm:grid-cols-[190px_110px_minmax(0,1fr)] sm:items-center sm:gap-x-8 sm:p-5"><h3 className="text-sm font-semibold text-[#001e33]">{name}</h3><AdminStatusBadge tone={badge.tone} className="w-fit">{badge.label}</AdminStatusBadge><div className="text-xs leading-5 text-[#68777a]"><p>{summary}</p><p className="mt-1">{detail}</p></div></div>;
}

function MissingCalendarAccordion({ villas }: { villas: DashboardVilla[] }) {
  const { locale, copy } = useAdminLocale();
  const count = villas.length;
  if (!count) return <div className="grid gap-2 p-4 sm:grid-cols-[190px_110px_minmax(0,1fr)] sm:items-center sm:gap-x-8 sm:p-5"><h3 className="text-sm font-semibold text-[#001e33]">{copy("Villa calendar connections", "การเชื่อมต่อปฏิทินวิลล่า")}</h3><AdminStatusBadge tone="success" className="w-fit">{copy("Healthy", "ปกติ")}</AdminStatusBadge><div className="text-xs leading-5 text-[#68777a]"><p>{copy("All published villas have a calendar ID.", "วิลล่าที่เผยแพร่ทั้งหมดมีรหัสปฏิทินแล้ว")}</p></div></div>;
  return <details className="group"><summary className="grid cursor-pointer list-none gap-2 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c66f4e] sm:grid-cols-[190px_110px_minmax(0,1fr)] sm:items-center sm:gap-x-8 sm:p-5 [&::-webkit-details-marker]:hidden"><h3 className="text-sm font-semibold text-[#001e33]">{copy("Villa calendar connections", "การเชื่อมต่อปฏิทินวิลล่า")}</h3><AdminStatusBadge tone="warning" className="w-fit">{copy(`${count} issue${count === 1 ? "" : "s"}`, `${count} ปัญหา`)}</AdminStatusBadge><span className="flex min-h-9 items-center justify-between gap-3 text-xs font-semibold text-[#0f6474]"><span>{copy(`View ${count} villa${count === 1 ? "" : "s"} missing a calendar`, `ดูวิลล่าที่ยังไม่มีปฏิทิน ${count} แห่ง`)}</span><ChevronDown size={15} className="shrink-0 transition-transform group-open:rotate-180" /></span></summary><div className="mx-4 mb-4 divide-y divide-[#ece7df] rounded-lg border border-[#e4ded4] bg-[#fcfbf8] sm:mx-5 sm:mb-5">{villas.map((villa) => <div key={villa._id} className="flex min-w-0 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#001e33]" title={locale === "th" ? villa.nameTh : villa.nameEn}>{locale === "th" ? villa.nameTh : villa.nameEn}</p><p className="mt-0.5 truncate text-[10px] text-[#68777a]">{locale === "th" ? villa.nameEn : villa.nameTh}</p></div><Link href={`/admin/villas/${villa._id}?lang=${locale}`} className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border border-[#cfc8bc] bg-white px-3 text-xs font-semibold text-[#0f6474] transition hover:border-[#0f6474] hover:bg-[#eef5f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] focus-visible:ring-offset-2">{copy("Open villa", "เปิดวิลล่า")}</Link></div>)}</div></details>;
}

function AuditPanel() {
  const { locale, copy } = useAdminLocale();
  const rows = useQuery(api.adminDashboard.audit);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("all");
  const actions = useMemo(() => Array.from(new Set(rows?.map((row) => row.action) ?? [])).sort(), [rows]);
  const entities = useMemo(() => Array.from(new Set(rows?.map((row) => row.entityType) ?? [])).sort(), [rows]);
  const actionLabels: Record<string, [string, string]> = { create: ["Created", "สร้าง"], update: ["Updated", "อัปเดต"], publish: ["Published", "เผยแพร่"], hide: ["Hidden", "ซ่อน"], archive: ["Archived", "เก็บถาวร"], delete: ["Deleted", "ลบ"], suspend: ["Suspended", "ระงับ"], restore: ["Restored", "กู้คืน"], sync: ["Synchronized", "ซิงค์"], notification_retry: ["Retried notification", "ลองส่งการแจ้งเตือนอีกครั้ง"] };
  const entityLabels: Record<string, [string, string]> = { villa: ["villa", "วิลล่า"], villa_photos: ["villa photos", "รูปภาพวิลล่า"], villa_amenities: ["villa amenities", "สิ่งอำนวยความสะดวกของวิลล่า"], rate: ["rate", "ราคา"], rule: ["house rule", "กฎของที่พัก"], sleeping: ["sleeping arrangement", "การจัดเตียง"], amenity: ["amenity", "สิ่งอำนวยความสะดวก"], settings: ["business settings", "การตั้งค่าธุรกิจ"], bookingRequest: ["inquiry", "คำถาม"], user: ["administrator", "ผู้ดูแลระบบ"] };
  const actionLabel = (value: string) => (actionLabels[value]?.[locale === "th" ? 1 : 0] ?? copy("Changed", "เปลี่ยนแปลง"));
  const entityLabel = (value: string) => (entityLabels[value]?.[locale === "th" ? 1 : 0] ?? copy("item", "รายการ"));
  const activityLabel = (row: { action: string; entityType: string }) => `${actionLabel(row.action)} ${entityLabel(row.entityType)}`;
  const visible = rows?.filter((row) => (action === "all" || row.action === action) && (entity === "all" || row.entityType === entity) && (!search || `${row.actorWorkosUserId} ${activityLabel(row)}`.toLowerCase().includes(search.toLowerCase()))) ?? [];
  return <AdminPanel><AdminPanelHeader title={copy("Important administrator activity", "กิจกรรมสำคัญของผู้ดูแลระบบ")} detail={copy("Newest actions first; records are retained for accountability.", "แสดงการดำเนินการล่าสุดก่อน และเก็บบันทึกไว้เพื่อตรวจสอบย้อนหลัง")} /><div className="grid gap-3 border-b border-[#e8e2d8] p-3 sm:grid-cols-[1fr_180px_180px]"><AdminField label={copy("Search activity", "ค้นหากิจกรรม")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy("User ID or change", "รหัสผู้ใช้หรือการเปลี่ยนแปลง")} /><AdminSelect label={copy("Action", "การดำเนินการ")} value={action} onChange={(event) => setAction(event.target.value)}><option value="all">{copy("All actions", "การดำเนินการทั้งหมด")}</option>{actions.map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}</AdminSelect><AdminSelect label={copy("Object", "รายการ")} value={entity} onChange={(event) => setEntity(event.target.value)}><option value="all">{copy("All objects", "รายการทั้งหมด")}</option>{entities.map((value) => <option key={value} value={value}>{entityLabel(value)}</option>)}</AdminSelect></div>{rows === undefined ? <AdminSkeleton rows={5} /> : rows.length === 0 ? <AdminEmptyState title={copy("No activity recorded yet", "ยังไม่มีกิจกรรมที่บันทึกไว้")} detail={copy("Important administrator actions will appear here automatically.", "การดำเนินการสำคัญของผู้ดูแลระบบจะแสดงที่นี่โดยอัตโนมัติ")} /> : visible.length === 0 ? <AdminEmptyState title={copy("No matching activity", "ไม่พบกิจกรรมที่ตรงกัน")} detail={copy("Try another user ID, action, or object type.", "ลองค้นหารหัสผู้ใช้ การดำเนินการ หรือประเภทรายการอื่น")} action={<AdminButton variant="secondary" onClick={() => { setSearch(""); setAction("all"); setEntity("all"); }}>{copy("Reset filters", "รีเซ็ตตัวกรอง")}</AdminButton>} /> : <ol className="divide-y divide-[#ece7df]">{visible.map((row) => <li key={row._id} className="grid gap-2 p-4 sm:grid-cols-[180px_1fr_auto] sm:items-center sm:p-5"><p className="break-all font-mono text-[10px] text-[#68777a]">{row.actorWorkosUserId}</p><div><p className="text-sm text-[#163038]">{activityLabel(row)}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#7c8788]">{row.entityId}</p></div><time className="text-xs text-[#68777a]">{formatNumericDateTime(row._creationTime)}</time></li>)}</ol>}</AdminPanel>;
}
