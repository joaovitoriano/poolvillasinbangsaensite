"use node";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { requireGoogleOAuthConfiguration } from "./googleOAuthConfig";

const ENCRYPTION_CONTEXT = Buffer.from("poolvillasinbangsaen:google-refresh-token:v1", "utf8");

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  error?: string;
};

function encryptionKey() {
  const configured = requireGoogleOAuthConfiguration().encryptionKey;
  const decoded = Buffer.from(configured, "base64");
  if (decoded.length !== 32 || decoded.toString("base64") !== configured) {
    throw new ConvexError({ code: "GOOGLE_SETUP_REQUIRED" });
  }
  return decoded;
}

export function encryptRefreshToken(refreshToken: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(ENCRYPTION_CONTEXT);
  const ciphertext = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return { encryptedRefreshToken: ciphertext.toString("base64"), nonce: nonce.toString("base64") };
}

function decryptRefreshToken(encryptedRefreshToken: string, nonce: string) {
  const key = encryptionKey();
  try {
    const payload = Buffer.from(encryptedRefreshToken, "base64");
    const iv = Buffer.from(nonce, "base64");
    if (iv.length !== 12 || payload.length <= 16) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(ENCRYPTION_CONTEXT);
    decipher.setAuthTag(payload.subarray(-16));
    return Buffer.concat([decipher.update(payload.subarray(0, -16)), decipher.final()]).toString("utf8");
  } catch {
    throw new ConvexError({ code: "GOOGLE_SETUP_REQUIRED" });
  }
}

export async function requestGoogleToken(parameters: Record<string, string>): Promise<{ ok: boolean; data: TokenResponse }> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(parameters),
      signal: AbortSignal.timeout(20_000),
    });
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new Error();
    const object = payload as Record<string, unknown>;
    // Never persist, log, or expose Google's raw response or error description.
    const data: TokenResponse = {};
    for (const name of ["access_token", "refresh_token", "scope", "error"] as const) {
      if (typeof object[name] === "string") data[name] = object[name];
    }
    return { ok: response.ok, data };
  } catch {
    throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_FAILED" });
  }
}

export async function getAccessToken(ctx: ActionCtx): Promise<string> {
  const { clientId, clientSecret } = requireGoogleOAuthConfiguration();
  const connection = await ctx.runQuery(internal.googleOAuthData.getStoredConnection, {});
  if (!connection) throw new Error("Connect Google in Integrations before syncing. / โปรดเชื่อมต่อ Google ในหน้าการเชื่อมต่อก่อนซิงค์");
  if (connection.status === "reconnect_required") throw new Error("Google access has expired or been revoked. Reconnect Google in Integrations. / สิทธิ์การเข้าถึง Google หมดอายุหรือถูกเพิกถอน โปรดเชื่อมต่อ Google ใหม่ในหน้าการเชื่อมต่อ");
  const refreshToken = decryptRefreshToken(connection.encryptedRefreshToken, connection.nonce);
  const { ok, data } = await requestGoogleToken({
    client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token",
  });
  if (!ok) {
    if (data.error === "invalid_grant") {
      const markedCurrent = await ctx.runMutation(internal.googleOAuthData.requireReconnect, { credentialVersion: connection.credentialVersion });
      if (!markedCurrent) throw new Error("Google connection changed during synchronization. Try syncing again. / การเชื่อมต่อ Google เปลี่ยนแปลงระหว่างการซิงค์ โปรดลองซิงค์อีกครั้ง");
      throw new Error("Google access has expired or been revoked. Reconnect Google in Integrations. / สิทธิ์การเข้าถึง Google หมดอายุหรือถูกเพิกถอน โปรดเชื่อมต่อ Google ใหม่ในหน้าการเชื่อมต่อ");
    }
    if (data.error === "invalid_client" || data.error === "unauthorized_client") throw new ConvexError({ code: "GOOGLE_SETUP_REQUIRED" });
    throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_FAILED" });
  }
  if (!data.access_token) throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_FAILED" });
  return data.access_token;
}
