"use client";

import { AuthKitProvider, useAccessToken, useAuth } from "@workos-inc/authkit-nextjs/components";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useState } from "react";

function useWorkOSConvexAuth() {
  const { user, loading: isLoading } = useAuth();
  const { getAccessToken, refresh } = useAccessToken();
  const fetchAccessToken = useCallback(
    async (
      { forceRefreshToken }: { forceRefreshToken?: boolean } = {},
    ): Promise<string | null> => {
      if (!user) return null;

      try {
        if (forceRefreshToken) return (await refresh()) ?? null;
        return (await getAccessToken()) ?? null;
      } catch (error) {
        console.error("Failed to get WorkOS access token", error);
        return null;
      }
    },
    [getAccessToken, refresh, user],
  );

  return {
    isLoading,
    isAuthenticated: Boolean(user),
    fetchAccessToken,
  };
}

function AuthenticatedConvexProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));
  return (
    <ConvexProviderWithAuth client={client} useAuth={useWorkOSConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthKitProvider>
      <AuthenticatedConvexProvider>{children}</AuthenticatedConvexProvider>
    </AuthKitProvider>
  );
}
