"use client";

import type { ReactNode } from "react";
import { type Localized } from "@/components/locale-provider";

type PageFrameProps = {
  title?: Localized;
  mobileTitle?: Localized;
  hideHeaderOnMobile?: boolean;
  description?: Localized;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageFrame({ action, children, className = "" }: PageFrameProps) {
  return (
    <div className={`grid min-w-0 gap-4  ${className}`}>
      {action ? <div className="w-full [&>*]:w-full">{action}</div> : null}
      {children}
    </div>
  );
}
