"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useConvexAuth, useQuery } from "convex/react";
import { LoaderCircle, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { AdminButton } from "./AdminUI";
import { useAdminLocale } from "./AdminLocale";
import type { AdminSessionUser } from "./AdminShell";

export function AdminAccessGate({ children }: { children: (user: AdminSessionUser) => ReactNode }) {
  const { copy } = useAdminLocale();
  const { user: workosUser, loading: authLoading } = useAuth();
  const { isLoading: convexAuthLoading, isAuthenticated } = useConvexAuth();
  const authenticatedUser = useQuery(api.auth.current, isAuthenticated ? {} : "skip");
  const currentUser: AdminSessionUser | null | undefined = authenticatedUser;

  if (authLoading) return <AdminGate title={copy("Checking your session", "กำลังตรวจสอบเซสชัน")} detail={copy("Securely loading the management area…", "กำลังโหลดระบบจัดการอย่างปลอดภัย…")} />;
  if (!workosUser) return <AdminGate title={copy("Administrator sign in", "เข้าสู่ระบบผู้ดูแล")} detail={copy("Sign in with the account invited to manage Pool Villas in Bangsaen.", "เข้าสู่ระบบด้วยบัญชีที่ได้รับเชิญให้จัดการพูลวิลล่าในบางแสน")} action />;
  if ((convexAuthLoading || !isAuthenticated)) return <AdminGate title={copy("Connecting your secure session", "กำลังเชื่อมต่อเซสชันที่ปลอดภัย")} detail={copy("Verifying your administrator access…", "กำลังตรวจสอบสิทธิ์ผู้ดูแล…")} />;
  if (currentUser === undefined) return <AdminGate title={copy("Verifying administrator access", "กำลังตรวจสอบสิทธิ์ผู้ดูแล")} detail={copy("Checking your WorkOS organization membership…", "กำลังตรวจสอบสมาชิกองค์กร WorkOS…")} />;
  if (currentUser === null) return <AdminGate title={copy("Administrator access unavailable", "ไม่สามารถเข้าใช้งานในฐานะผู้ดูแลได้")} detail={copy(`Signed in as ${workosUser?.email}, but this account does not have an active admin membership for this organization.`, `เข้าสู่ระบบด้วย ${workosUser?.email} แต่บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลที่ใช้งานอยู่สำหรับองค์กรนี้`)} signOutAction />;
  if (!currentUser) return <AdminGate title={copy("Administrator access unavailable", "ไม่สามารถเข้าใช้งานในฐานะผู้ดูแลได้")} detail={copy("No authenticated administrator session is available.", "ไม่พบเซสชันผู้ดูแลที่ยืนยันตัวตนแล้ว")} />;
  return children(currentUser);
}

function AdminGate({ title, detail, action = false, signOutAction = false }: { title: string; detail: string; action?: boolean; signOutAction?: boolean }) {
  const { signOut } = useAuth();
  const { locale, copy } = useAdminLocale();
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfaf6] p-6">
      <section className="w-full max-w-md border border-[#ddd6ca] bg-white p-7 text-center shadow-[0_18px_50px_rgba(0,30,51,.07)]">
        <Image src="/brand-logo.png" alt={copy("Pool Villas in Bangsaen", "พูลวิลล่าในบางแสน")} width={245} height={56} className="mx-auto h-14 w-auto" />
        {!action && !signOutAction ? <LoaderCircle size={18} className="mx-auto mt-6 animate-spin text-[#0f6474] motion-reduce:animate-none" /> : null}
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[#001e33]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#68777a]">{detail}</p>
        {action ? <Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center justify-center bg-[#062544] px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#178067]">{copy("Sign in securely", "เข้าสู่ระบบอย่างปลอดภัย")}</Link> : null}
        {signOutAction ? <AdminButton variant="secondary" className="mt-6" onClick={() => void signOut({ returnTo: `${window.location.origin}/${locale}` })}><LogOut size={15} /> {copy("Sign out", "ออกจากระบบ")}</AdminButton> : null}
      </section>
    </main>
  );
}
