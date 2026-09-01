"use client";

import { useQuery } from "convex/react";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { formatNumericDateTime } from "@/lib/date-format";
import { googleOAuthMessages, isGoogleOAuthError, type GoogleOAuthError } from "@/lib/google-oauth-result";
import { useAdminLocale } from "./AdminLocale";
import { AdminButton, AdminNotice, AdminPanel, AdminPanelHeader, AdminSkeleton, AdminStatusBadge } from "./AdminUI";

export function GoogleConnectionPanel({ disabled = false }: { disabled?: boolean }) {
  const { copy, locale } = useAdminLocale();
  const connection = useQuery(api.googleOAuth.getConnectionStatus);
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GoogleOAuthError | null>(null);
  const [started, setStarted] = useState(false);
  const result = started ? null : searchParams.get("google");
  const resultError = error ?? (isGoogleOAuthError(result) ? result : null);
  const message = resultError ? googleOAuthMessages[resultError] : null;

  async function connect() {
    setBusy(true);
    setStarted(true);
    setError(null);
    try {
      const response = await fetch("/admin/integrations/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const body: unknown = await response.json();
      if (!body || typeof body !== "object") throw new Error("Invalid response");
      if (!response.ok) {
        setError("error" in body && isGoogleOAuthError(body.error) ? body.error : "request_failed");
        setBusy(false);
        return;
      }
      if (!("url" in body) || typeof body.url !== "string") throw new Error("Invalid response");
      const target = new URL(body.url);
      if (target.origin !== "https://accounts.google.com" || target.pathname !== "/o/oauth2/v2/auth") throw new Error("Invalid destination");
      window.location.assign(target.href);
    } catch {
      setError("request_failed");
      setBusy(false);
    }
  }

  const status = connection?.status;
  const badge = status === "connected"
    ? { tone: "success" as const, text: copy("Connected", "เชื่อมต่อแล้ว") }
    : status === "reconnect_required"
      ? { tone: "danger" as const, text: copy("Reconnect required", "ต้องเชื่อมต่อใหม่") }
      : status === "setup_required"
        ? { tone: "warning" as const, text: copy("Setup required", "ต้องตั้งค่าเพิ่มเติม") }
        : { tone: "neutral" as const, text: copy("Not connected", "ยังไม่ได้เชื่อมต่อ") };

  return <AdminPanel>
    <AdminPanelHeader title={copy("Google Calendar connection", "การเชื่อมต่อ Google Calendar")} />
    {connection === undefined ? <AdminSkeleton rows={2} className="min-h-28" /> : <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <AdminStatusBadge tone={badge.tone}>{badge.text}</AdminStatusBadge>
          <p className="text-sm leading-6 text-[#526266]">{status === "reconnect_required"
            ? copy("Google access has expired or been revoked. Reconnect to resume availability updates.", "สิทธิ์เข้าถึง Google หมดอายุหรือถูกเพิกถอน เชื่อมต่อใหม่เพื่ออัปเดตวันว่างต่อ")
            : status === "setup_required"
              ? copy("Google connection setup is incomplete. Check the server configuration before connecting.", "การตั้งค่าการเชื่อมต่อ Google ยังไม่ครบ โปรดตรวจสอบการตั้งค่าฝั่งเซิร์ฟเวอร์ก่อนเชื่อมต่อ")
              : status === "not_connected"
                ? copy("Connect the Google account that manages your villa calendars.", "เชื่อมต่อบัญชี Google ที่จัดการปฏิทินวิลล่าของคุณ")
                : copy("Google access is saved. Check import status in Connection health below.", "บันทึกสิทธิ์เข้าถึง Google แล้ว ตรวจสอบสถานะการนำเข้าในส่วนสถานะการเชื่อมต่อด้านล่าง")}</p>
          {connection.connectedAt ? <p className="text-xs text-[#68777a]">{copy("Last connected: ", "เชื่อมต่อล่าสุด: ")}{formatNumericDateTime(connection.connectedAt)}</p> : null}
        </div>
        <AdminButton onClick={() => void connect()} disabled={disabled || status === "setup_required"} busy={busy} busyLabel={copy("Opening Google…", "กำลังเปิด Google…")} className="w-full shrink-0 sm:w-auto">
          {status === "not_connected" || status === "setup_required" ? copy("Connect Google", "เชื่อมต่อ Google") : copy("Reconnect Google", "เชื่อมต่อ Google ใหม่")}<ExternalLink size={14} aria-hidden="true" />
        </AdminButton>
      </div>
      {disabled ? <p className="text-xs text-[#68777a]">{copy("Save or reset your changes before connecting Google.", "บันทึกหรือรีเซ็ตการเปลี่ยนแปลงก่อนเชื่อมต่อ Google")}</p> : null}
      {message ? <AdminNotice tone={resultError === "cancelled" ? "info" : "error"}>{copy(message[0], message[1])}{resultError === "session_expired" ? <Link href="/sign-in" prefetch={false} className="ml-2 inline-flex min-h-11 items-center font-semibold underline focus-visible:outline focus-visible:outline-2">{copy("Sign in again", "เข้าสู่ระบบอีกครั้ง")}</Link> : null}</AdminNotice> : null}
      {!message && result === "connected" && status === "connected" ? <AdminNotice tone="success">{copy("Google connected. Availability synchronization has been queued.", "เชื่อมต่อ Google แล้ว กำลังรอเริ่มซิงค์วันว่าง")}</AdminNotice> : null}
    </div>}
  </AdminPanel>;
}
