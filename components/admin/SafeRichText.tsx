"use client";

import createDOMPurify from "dompurify";
import { useEffect, useState } from "react";

const allowedTags = [
  "a", "b", "blockquote", "br", "code", "div", "em", "i", "li", "ol", "p", "pre", "s", "span", "strong", "u", "ul",
];

export function plainTextFromRichText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p\s*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeCalendarRichText(value: string) {
  if (typeof window === "undefined") return plainTextFromRichText(value);
  return createDOMPurify(window).sanitize(value, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ["dir", "href", "title"],
    ALLOW_DATA_ATTR: false,
  });
}

export function SafeRichText({ value, compact = false, className = "" }: { value: string; compact?: boolean; className?: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => setHtml(sanitizeCalendarRichText(value)), [value]);

  if (html === null) return <span className={className}>{plainTextFromRichText(value)}</span>;
  return (
    <div
      className={`${compact ? "max-h-[1.25em] overflow-hidden [&_*]:inline" : "[&_a]:font-semibold [&_a]:text-[#0f6474] [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[#d9d3c8] [&_blockquote]:pl-3 [&_br]:block [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[#f4f1eb] [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-5"} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
