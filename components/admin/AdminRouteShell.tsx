"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { AdminAccessGate } from "./AdminAccessGate";
import { AdminLocaleProvider } from "./AdminLocale";
import { AdminShell, type AdminSessionUser } from "./AdminShell";

const AdminSessionContext = createContext<AdminSessionUser | null>(null);
const AdminNavigationGuardContext = createContext<((guard: (() => boolean) | null) => void) | null>(null);

export function AdminRouteShell({ children }: { children: ReactNode }) {
  const navigationGuard = useRef<(() => boolean) | null>(null);
  const setNavigationGuard = useCallback((guard: (() => boolean) | null) => {
    navigationGuard.current = guard;
  }, []);
  const canNavigate = useCallback(() => navigationGuard.current?.() ?? true, []);

  return (
    <AdminLocaleProvider>
      <AdminAccessGate>
        {(user) => (
          <AdminSessionContext.Provider value={user}>
            <AdminNavigationGuardContext.Provider value={setNavigationGuard}>
              <AdminShell user={user} canNavigate={canNavigate}>{children}</AdminShell>
            </AdminNavigationGuardContext.Provider>
          </AdminSessionContext.Provider>
        )}
      </AdminAccessGate>
    </AdminLocaleProvider>
  );
}

export function useAdminSession() {
  const user = useContext(AdminSessionContext);
  if (!user) throw new Error("useAdminSession must be used inside AdminRouteShell");
  return user;
}

export function useAdminNavigationGuard(guard: (() => boolean) | null) {
  const setNavigationGuard = useContext(AdminNavigationGuardContext);
  if (!setNavigationGuard) throw new Error("useAdminNavigationGuard must be used inside AdminRouteShell");
  useEffect(() => {
    setNavigationGuard(guard);
    return () => setNavigationGuard(null);
  }, [guard, setNavigationGuard]);
}
