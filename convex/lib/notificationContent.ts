export type NotificationLanguage = "en" | "th";

export type BookingNotificationInput = {
  language: NotificationLanguage;
  villaName: string;
  dates: string;
  guests: number | null;
  estimatedTotalThb: number;
  phone: string | null;
  lineId: string | null;
  inquiryUrl: string;
  villaUrl: string;
  customerLineUrl?: string | null;
};

const copy = {
  en: {
    subject: "New booking request",
    villa: "Villa",
    dates: "Dates",
    guests: "Guests",
    estimate: "Estimated total",
    phone: "Phone",
    line: "LINE",
    unavailable: "Not provided",
    openInquiry: "Open inquiry",
    viewVilla: "View villa",
    addLineContact: "Add LINE contact",
    callPhone: "Call phone",
    footer: "Pool Villas in Bangsaen",
  },
  th: {
    subject: "คำขอจองใหม่",
    villa: "วิลล่า",
    dates: "วันที่เข้าพัก",
    guests: "จำนวนผู้เข้าพัก",
    estimate: "ยอดประมาณการ",
    phone: "โทรศัพท์",
    line: "LINE",
    unavailable: "ไม่ได้ระบุ",
    openInquiry: "เปิดคำขอจอง",
    viewVilla: "ดูวิลล่า",
    addLineContact: "เพิ่มเพื่อนใน LINE",
    callPhone: "โทรออก",
    footer: "พูลวิลล่าในบางแสน",
  },
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+66")) return `0${trimmed.slice(3).trimStart()}`;
  return trimmed.startsWith("0") ? trimmed : `0${trimmed}`;
}

function phoneHref(phone: string) {
  const normalized = normalizePhone(phone).replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return /\d/.test(normalized) ? `tel:${normalized}` : null;
}

export function bookingNotification(input: BookingNotificationInput) {
  const labels = copy[input.language];
  const guests = input.guests === null ? labels.unavailable : input.guests.toLocaleString(input.language === "th" ? "th-TH" : "en-US");
  const amount = `THB ${input.estimatedTotalThb.toLocaleString("en-US")}`;
  const phone = normalizePhone(input.phone ?? "") || labels.unavailable;
  const phoneUrl = input.phone ? phoneHref(input.phone) : null;
  const lineId = input.lineId || labels.unavailable;
  const customerLineUrl = input.customerLineUrl?.startsWith("https://") ? input.customerLineUrl : null;
  const rows = [
    { label: labels.villa, value: input.villaName },
    { label: labels.dates, value: input.dates },
    { label: labels.guests, value: guests },
    { label: labels.estimate, value: amount },
    { label: labels.phone, value: phone, href: phoneUrl, linkLabel: labels.callPhone },
    { label: labels.line, value: lineId, href: customerLineUrl, linkLabel: labels.addLineContact },
  ];
  const text = [
    labels.subject,
    "",
    ...rows.map((row) => row.href
      ? `${row.label}: ${row.value} (${row.linkLabel}: ${row.href})`
      : `${row.label}: ${row.value}`),
    "",
    `${labels.openInquiry}: ${input.inquiryUrl}`,
    `${labels.viewVilla}: ${input.villaUrl}`,
  ].join("\n");
  const htmlRows = rows.map((row) => {
    const value = row.href
      ? `<a href="${escapeHtml(row.href)}" style="color:#0f6474;text-decoration:underline;font-weight:600">${escapeHtml(row.value)}</a>`
      : escapeHtml(row.value);
    return `<tr><th style="padding:7px 12px 7px 0;text-align:left;vertical-align:top;color:#68777a;font-size:13px;font-weight:500;white-space:nowrap">${escapeHtml(row.label)}</th><td style="padding:7px 0;color:#163038;font-size:14px;line-height:1.45">${value}</td></tr>`;
  }).join("");
  const html = `<!doctype html><html lang="${input.language}"><body style="margin:0;background:#f6f4ef;font-family:Arial,sans-serif;color:#163038"><div style="max-width:560px;margin:0 auto;padding:24px 12px"><div style="background:#fff;border:1px solid #e4ded4;border-radius:8px;padding:24px"><h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#001e33">${escapeHtml(labels.subject)}</h1><table role="presentation" style="width:100%;border-collapse:collapse">${htmlRows}</table><div style="margin-top:20px"><a href="${escapeHtml(input.inquiryUrl)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 14px;border-radius:6px;background:#0f6474;color:#fff;text-decoration:none;font-size:13px;font-weight:700">${escapeHtml(labels.openInquiry)}</a><a href="${escapeHtml(input.villaUrl)}" style="display:inline-block;padding:9px 13px;border:1px solid #cfc8bc;border-radius:6px;color:#0f6474;text-decoration:none;font-size:13px;font-weight:700">${escapeHtml(labels.viewVilla)}</a></div></div><p style="margin:12px 0 0;text-align:center;color:#7c8788;font-size:11px">${escapeHtml(labels.footer)}</p></div></body></html>`;
  return { subject: `${labels.subject} — ${input.villaName}`, text, html, labels };
}

export function lineFlexMessage(input: BookingNotificationInput) {
  const labels = copy[input.language];
  const phone = normalizePhone(input.phone ?? "");
  const phoneUrl = input.phone ? phoneHref(input.phone) : null;
  const lineIdComponent = input.customerLineUrl
    ? {
        type: "text",
        text: input.lineId ?? labels.unavailable,
        size: "sm",
        color: "#0f6474",
        decoration: "underline",
        wrap: true,
        flex: 4,
        action: {
          type: "uri",
          label: labels.addLineContact,
          uri: input.customerLineUrl,
        },
      }
    : {
        type: "text",
        text: input.lineId || labels.unavailable,
        size: "sm",
        color: "#333333",
        wrap: true,
        flex: 4,
      };
  return {
    type: "flex",
    altText: labels.subject,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: labels.subject, weight: "bold", size: "lg", wrap: true },
          { type: "text", text: input.villaName, weight: "bold", size: "sm", color: "#0f6474", margin: "md", wrap: true },
          { type: "text", text: `${labels.dates}: ${input.dates} · ${labels.guests}: ${input.guests ?? labels.unavailable}`, size: "sm", color: "#555555", margin: "sm", wrap: true },
          { type: "text", text: `${labels.estimate}: THB ${input.estimatedTotalThb.toLocaleString("en-US")}`, size: "sm", color: "#555555", margin: "sm", wrap: true },
          { type: "separator", margin: "lg" },
          {
            type: "box",
            layout: "horizontal",
            margin: "lg",
            contents: [
              { type: "text", text: `${labels.phone}:`, size: "sm", color: "#555555", flex: 1 },
              {
                type: "text",
                text: phone || labels.unavailable,
                size: "sm",
                color: phoneUrl ? "#0f6474" : "#333333",
                decoration: phoneUrl ? "underline" : "none",
                wrap: true,
                flex: 4,
                ...(phoneUrl ? { action: { type: "uri", label: labels.callPhone, uri: phoneUrl } } : {}),
              },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "sm",
            contents: [
              { type: "text", text: `${labels.line}:`, size: "sm", color: "#555555", flex: 1 },
              lineIdComponent,
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "button", style: "link", height: "sm", action: { type: "uri", label: labels.openInquiry, uri: input.inquiryUrl } },
          { type: "button", style: "link", height: "sm", action: { type: "uri", label: labels.viewVilla, uri: input.villaUrl } },
        ],
      },
    },
  };
}
