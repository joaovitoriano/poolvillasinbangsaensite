"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";
import { useLocale } from "@/components/locale-provider";

export function Toaster() {
  const { t } = useLocale();
  return <Sonner
    theme="light"
    position="top-center"
    closeButton
    duration={5000}
    offset="calc(env(safe-area-inset-top) + 16px)"
    mobileOffset={{ top: "calc(env(safe-area-inset-top) + 16px)", left: 16, right: 16 }}
    containerAriaLabel={t({ en: "Notifications", th: "การแจ้งเตือน" })}
    toastOptions={{ closeButtonAriaLabel: t({ en: "Dismiss notification", th: "ปิดการแจ้งเตือน" }) }}
    style={{
      "--normal-bg": "var(--popover)",
      "--normal-text": "var(--popover-foreground)",
      "--normal-border": "var(--border)",
      "--border-radius": "var(--radius)",
      width: "min(356px, calc(100vw - 32px))",
    } as CSSProperties}
  />;
}
