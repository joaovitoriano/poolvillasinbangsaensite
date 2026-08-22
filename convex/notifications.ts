import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, env, internalAction } from "./_generated/server";
import { notificationChannelValidator } from "./lib/validators";
import { formatNumericDateRange } from "./lib/dates";
import { lineContactUrl } from "./lib/line";
import { bookingNotification, lineFlexMessage, type BookingNotificationInput, type NotificationLanguage } from "./lib/notificationContent";

function testNotificationInput(language: NotificationLanguage): BookingNotificationInput {
  const siteUrl = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    language,
    villaName: language === "th" ? "วิลล่าทดสอบ" : "Test villa",
    dates: "22/08/2026 – 24/08/2026",
    guests: 8,
    estimatedTotalThb: 12500,
    phone: "081-234-5678",
    lineId: "@poolvillasbangsaen",
    inquiryUrl: `${siteUrl}/admin?view=inquiries`,
    villaUrl: `${siteUrl}/${language}/villas/test-villa`,
    customerLineUrl: lineContactUrl("@poolvillasbangsaen"),
  };
}

export const testLine = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const settings = await ctx.runQuery(internal.settings.getNotificationPreviewSettings, {});
    try {
      const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
      if (!settings.lineNotificationUserId) throw new Error("Save a LINE notification recipient user ID before testing. / บันทึกรหัสผู้ใช้ผู้รับการแจ้งเตือน LINE ก่อนทดสอบ");
      if (!token) throw new Error("The LINE channel access token is not configured. / ยังไม่ได้กำหนดค่าโทเค็นการเข้าถึงช่อง LINE");
      const message = lineFlexMessage(testNotificationInput(settings.notificationLanguage));
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: settings.lineNotificationUserId,
          messages: [message],
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 400);
        throw new Error(`LINE rejected the test message (${response.status}): ${detail} / LINE ปฏิเสธข้อความทดสอบ (${response.status})`);
      }
      return null;
    } catch (error) {
      throw error;
    }
  },
});

export const testEmail = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const settings = await ctx.runQuery(internal.settings.getNotificationPreviewSettings, {});
    try {
      const apiKey = env.RESEND_API_KEY?.trim();
      const from = env.NOTIFICATION_FROM_EMAIL?.trim();
      if (!settings.notificationEmails.length) throw new Error("Save at least one notification email address before testing. / บันทึกอีเมลรับการแจ้งเตือนอย่างน้อยหนึ่งรายการก่อนทดสอบ");
      if (!apiKey) throw new Error("The Resend API key is not configured. / ยังไม่ได้กำหนดค่า API key ของ Resend");
      if (!from) throw new Error("The notification sender email is not configured. / ยังไม่ได้กำหนดอีเมลผู้ส่งการแจ้งเตือน");
      const content = bookingNotification(testNotificationInput(settings.notificationLanguage));
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `notification-health/${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          from,
          to: settings.notificationEmails,
          subject: content.subject,
          text: content.text,
          html: content.html,
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 400);
        throw new Error(`Resend rejected the test email (${response.status}): ${detail} / Resend ปฏิเสธอีเมลทดสอบ (${response.status})`);
      }
      return null;
    } catch (error) {
      throw error;
    }
  },
});

export const deliver = internalAction({
  args: { requestId: v.id("bookingRequests"), channel: notificationChannelValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload = await ctx.runQuery(internal.bookingRequests.notificationPayload, args);
    const { request, villa, settings, delivery } = payload;
    const siteUrl=(env.PUBLIC_SITE_URL??"http://localhost:3000").replace(/\/$/,"");
    const inquiryUrl = `${siteUrl}/admin?view=inquiries`;
    const notificationLanguage = settings?.notificationLanguage ?? "th";
    const villaUrl = `${siteUrl}/${notificationLanguage}/villas/${villa.slug}`;
    const customerLineUrl = lineContactUrl(request.lineId ?? "");
    if (!settings) {
      await ctx.runMutation(internal.bookingRequests.recordDelivery, {
        deliveryId: delivery._id,
        status: "not_configured",
        error: "Notification settings are not initialized",
      });
      return null;
    }
    const notificationInput: BookingNotificationInput = {
      language: notificationLanguage,
      villaName: notificationLanguage === "th" ? villa.nameTh : villa.nameEn,
      dates: formatNumericDateRange(request.checkIn, request.checkOut),
      guests: request.guestCount ?? null,
      estimatedTotalThb: request.estimatedTotalThb,
      phone: request.phone ?? null,
      lineId: request.lineId ?? null,
      inquiryUrl,
      villaUrl,
      customerLineUrl,
    };
    try {
      if (args.channel === "email") {
        if (!env.RESEND_API_KEY || !env.NOTIFICATION_FROM_EMAIL || !settings.notificationEmails.length) {
          await ctx.runMutation(internal.bookingRequests.recordDelivery, { deliveryId: delivery._id, status: "not_configured", error: "Email notification credentials or recipients are not configured" });
          return null;
        }
        const content = bookingNotification(notificationInput);
        const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `booking-request/${delivery._id}` }, body: JSON.stringify({ from: env.NOTIFICATION_FROM_EMAIL, to: settings.notificationEmails, subject: content.subject, text: content.text, html: content.html }) });
        if (!response.ok) throw new Error(`Email provider returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
        await ctx.runMutation(internal.bookingRequests.recordDelivery, { deliveryId: delivery._id, status: "sent" });
      } else {
        const lineRecipient =
          settings?.lineNotificationUserId?.trim() || env.LINE_OWNER_USER_ID;
        if (!env.LINE_CHANNEL_ACCESS_TOKEN || !lineRecipient) {
          await ctx.runMutation(internal.bookingRequests.recordDelivery, { deliveryId: delivery._id, status: "not_configured", error: "LINE Messaging API credentials are not configured" });
          return null;
        }
        const message = lineFlexMessage(notificationInput);
        const response = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: lineRecipient,
            messages: [message],
          }),
        });
        if (!response.ok) throw new Error(`LINE provider returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
        await ctx.runMutation(internal.bookingRequests.recordDelivery, { deliveryId: delivery._id, status: "sent" });
      }
    } catch (error) {
      await ctx.runMutation(internal.bookingRequests.recordDelivery, { deliveryId: delivery._id, status: "failed", error: error instanceof Error ? error.message : "Unknown notification failure" });
    }
    return null;
  },
});
