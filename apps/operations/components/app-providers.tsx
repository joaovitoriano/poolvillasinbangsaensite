"use client";

import { AuthKitProvider, useAccessToken, useAuth } from "@workos-inc/authkit-nextjs/components";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useState } from "react";
import { LocaleProvider } from "@/components/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

function useWorkOSConvexAuth() {
  const { user, loading: isLoading } = useAuth();
  const { getAccessToken, refresh } = useAccessToken();
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}) => {
      if (!user) return null;
      try {
        return forceRefreshToken ? (await refresh()) ?? null : (await getAccessToken()) ?? null;
      } catch (error) {
        console.error(document.documentElement.lang === "th" ? "ไม่สามารถต่ออายุเซสชันระบบจัดการได้" : "Unable to refresh the operations session", error);
        return null;
      }
    },
    [getAccessToken, refresh, user],
  );
  return { isLoading, isAuthenticated: Boolean(user), fetchAccessToken };
}

function ConvexAuthProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));
  return <ConvexProviderWithAuth client={client} useAuth={useWorkOSConvexAuth}>{children}</ConvexProviderWithAuth>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthKitProvider>
      <ConvexAuthProvider>
        <LocaleProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </LocaleProvider>
      </ConvexAuthProvider>
    </AuthKitProvider>
  );
}
