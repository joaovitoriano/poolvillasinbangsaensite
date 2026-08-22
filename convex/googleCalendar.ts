import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, env, internalAction, type ActionCtx } from "./_generated/server";
import { normalizeGoogleEvents, type GoogleCalendarEvent, type GoogleCalendarLabel } from "./lib/googleCalendar";

type CalendarSyncResult = { skipped: boolean; calendarsProcessed?: number; importedEvents?: number };
const calendarSyncResultValidator = v.object({ skipped: v.boolean(), calendarsProcessed: v.optional(v.number()), importedEvents: v.optional(v.number()) });
const WATCH_TTL_SECONDS = 7 * 24 * 60 * 60;
const RENEW_BEFORE_MS = 24 * 60 * 60_000;

class SyncTokenExpiredError extends Error {}

type CalendarLabelsResponse = { labelProperties?: { eventLabels?: Array<{ id?: string; backgroundColor?: string }> } };

async function accessToken() {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = env.GOOGLE_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Google Calendar OAuth credentials are not configured / ยังไม่ได้กำหนดค่าข้อมูลรับรอง Google Calendar OAuth");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }) });
  if (!response.ok) throw new Error(`Google OAuth returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Google OAuth did not return an access token / Google OAuth ไม่ได้ส่งคืนโทเค็นการเข้าถึง");
  return data.access_token;
}

function webhookUrl() {
  const base = env.CONVEX_SITE_URL?.replace(/\/$/, "");
  if (!base?.startsWith("https://")) throw new Error("CONVEX_SITE_URL is unavailable or is not HTTPS / ไม่พบ CONVEX_SITE_URL หรือ URL ไม่ใช่ HTTPS");
  return `${base}/webhooks/google-calendar`;
}

async function watchCalendar(token: string, calendarId: string, channelId: string, channelToken: string) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: channelId, type: "web_hook", address: webhookUrl(), token: channelToken, params: { ttl: String(WATCH_TTL_SECONDS) } }),
  });
  if (!response.ok) throw new Error(`Google Calendar watch returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
  const data = await response.json() as { resourceId?: string; expiration?: string };
  if (!data.resourceId) throw new Error("Google Calendar watch did not return a resource ID / การเฝ้าดู Google Calendar ไม่ได้ส่งคืนรหัสทรัพยากร");
  const expiration = data.expiration ? Number(data.expiration) : undefined;
  return { resourceId: data.resourceId, channelExpiration: Number.isFinite(expiration) ? expiration : undefined };
}

async function stopWatch(token: string, channel: Pick<Doc<"googleCalendarChannels">, "channelId" | "resourceId">) {
  if (!channel.resourceId) return;
  const response = await fetch("https://www.googleapis.com/calendar/v3/channels/stop", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: channel.channelId, resourceId: channel.resourceId }) });
  if (!response.ok && response.status !== 404) throw new Error(`Google Calendar channel stop returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
}

async function listEventsPage(token: string, calendarId: string, syncToken?: string, pageToken?: string) {
  const params = new URLSearchParams({ singleEvents: "true", showDeleted: "true", maxResults: "200", eventLabelVersion: "1" });
  if (syncToken) params.set("syncToken", syncToken);
  if (pageToken) params.set("pageToken", pageToken);
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 410) throw new SyncTokenExpiredError("Google Calendar sync token expired");
  if (!response.ok) throw new Error(`Google Calendar events returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
  return await response.json() as { items?: GoogleCalendarEvent[]; nextPageToken?: string; nextSyncToken?: string };
}

async function calendarLabels(token: string, calendarId: string) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}?eventLabelVersion=1`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 403) throw new Error("Google Calendar authorization needs the calendar.readonly scope to read Mango and Tomato labels. Reconnect Google Calendar with that scope, then synchronize again. / การอนุญาต Google Calendar ต้องมีสิทธิ์ calendar.readonly เพื่ออ่านป้ายกำกับ Mango และ Tomato โปรดเชื่อมต่อ Google Calendar ใหม่ด้วยสิทธิ์นี้ แล้วซิงค์อีกครั้ง");
  if (!response.ok) throw new Error(`Google Calendar labels returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
  const data = await response.json() as CalendarLabelsResponse;
  return new Map<string, GoogleCalendarLabel>((data.labelProperties?.eventLabels ?? []).flatMap((label) => label.id ? [[label.id, { backgroundColor: label.backgroundColor }] as const] : []));
}

async function performSync(ctx: ActionCtx, token: string, channel: Doc<"googleCalendarChannels">, forceFull = false) {
  const labels = await calendarLabels(token, channel.calendarId);
  const syncToken = forceFull ? undefined : channel.syncToken;
  let generation: number | undefined;
  if (!syncToken) {
    const started = await ctx.runMutation(internal.calendarSyncData.beginFullSync, { villaId: channel.villaId, channelId: channel.channelId });
    if (started === null) return 0;
    generation = started;
  }
  let pageToken: string | undefined; let nextSyncToken: string | undefined; let imported = 0; let fetched = 0;
  do {
    const page = await listEventsPage(token, channel.calendarId, syncToken, pageToken);
    const items = page.items ?? [];
    fetched += items.length;
    const active = normalizeGoogleEvents(items, labels);
    const cancelledEventIds = items.filter((event) => event.status === "cancelled" && event.id).map((event) => event.id!);
    const result: { imported: number } = await ctx.runMutation(internal.calendarSyncData.applyEventChanges, { villaId: channel.villaId, events: active, cancelledEventIds, fullSyncGeneration: generation });
    imported += result.imported; pageToken = page.nextPageToken; nextSyncToken = page.nextSyncToken ?? nextSyncToken;
  } while (pageToken);
  if (!nextSyncToken) throw new Error("Google Calendar did not return a next sync token / Google Calendar ไม่ได้ส่งคืนโทเค็นซิงค์ถัดไป");
  if (generation !== undefined) while (await ctx.runMutation(internal.calendarSyncData.cleanupFullSync, { villaId: channel.villaId, generation }) > 0) { /* bounded cleanup batches */ }
  await ctx.runMutation(internal.calendarSyncData.completeSync, { villaId: channel.villaId, channelId: channel.channelId, syncToken: nextSyncToken, fetchedEvents: fetched, importedEvents: imported });
  return imported;
}

async function syncClaimedChannel(ctx: ActionCtx, villaId: Id<"villas">, token: string, forceFull = false) {
  let channel: Doc<"googleCalendarChannels"> | null = await ctx.runQuery(internal.calendarSyncData.getChannel, { villaId });
  if (!channel || channel.status !== "active") return 0;
  try {
    return await performSync(ctx, token, channel, forceFull);
  } catch (error) {
    if (error instanceof SyncTokenExpiredError) {
      channel = await ctx.runQuery(internal.calendarSyncData.getChannel, { villaId });
      if (!channel || channel.status !== "active") return 0;
      try { return await performSync(ctx, token, channel, true); }
    catch (fullError) { await ctx.runMutation(internal.calendarSyncData.failSync, { villaId, channelId: channel.channelId, error: fullError instanceof Error ? fullError.message : "Unknown synchronization error" }); throw fullError; }
    }
    await ctx.runMutation(internal.calendarSyncData.failSync, { villaId, channelId: channel.channelId, error: error instanceof Error ? error.message : "Unknown synchronization error" });
    throw error;
  }
}

async function registerCalendar(ctx: ActionCtx, token: string, villaId: Id<"villas">, calendarId: string, oldChannel: Doc<"googleCalendarChannels"> | null) {
  if (oldChannel?.resourceId) { try { await stopWatch(token, oldChannel); } catch { /* replacement remains safe because old notifications fail validation */ } }
  const channelId = crypto.randomUUID(); const channelToken = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
  await ctx.runMutation(internal.calendarSyncData.initializeChannel, { villaId, calendarId, channelId, channelToken });
  try {
    const watch = await watchCalendar(token, calendarId, channelId, channelToken);
    const activated = await ctx.runMutation(internal.calendarSyncData.activateChannel, { villaId, channelId, ...watch });
    if (!activated) { await stopWatch(token, { channelId, resourceId: watch.resourceId }); return 0; }
    return await syncClaimedChannel(ctx, villaId, token);
  } catch (error) {
    await ctx.runMutation(internal.calendarSyncData.markChannelError, { villaId, channelId, error: error instanceof Error ? error.message : "Unknown subscription error" });
    throw error;
  }
}

async function reconcileAll(ctx: ActionCtx, token: string) {
  const state = await ctx.runQuery(internal.calendarSyncData.getSyncState, {});
  const channels = await ctx.runQuery(internal.calendarSyncData.listChannels, {});
  const desired = new Map(state.calendars.map(({ villa }) => [villa._id, villa.googleCalendarId!]));
  const errors: string[] = []; let imported = 0;
  for (const channel of channels) if (!desired.has(channel.villaId)) {
    try { await stopWatch(token, channel); } catch (error) { errors.push(error instanceof Error ? error.message : "Unknown channel stop error"); }
    await ctx.runMutation(internal.calendarSyncData.stopChannel, { villaId: channel.villaId, removeBlocks: true });
  }
  for (const [villaId, calendarId] of desired) {
    const existing = channels.find((channel) => channel.villaId === villaId) ?? null;
    if (existing?.calendarId === calendarId && existing.status === "active" && (existing.channelExpiration ?? 0) > Date.now() + RENEW_BEFORE_MS) continue;
    if (existing?.calendarId === calendarId && existing.status === "active" && existing.syncInProgress) continue;
    try { imported += await registerCalendar(ctx, token, villaId, calendarId, existing); }
    catch (error) { errors.push(`${calendarId}: ${error instanceof Error ? error.message : "Unknown channel registration error"}`); }
  }
  return { state, errors, imported };
}

export const reconcileSubscriptions = internalAction({ args: {}, returns: v.null(), handler: async (ctx) => { const token = await accessToken(); await reconcileAll(ctx, token); return null; } });

export const syncChannel = internalAction({
  args: { villaId: v.id("villas"), alreadyClaimed: v.optional(v.boolean()) }, returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.alreadyClaimed) { const claimed = await ctx.runMutation(internal.calendarSyncData.claimSync, { villaId: args.villaId }); if (!claimed) return null; }
    const channel = await ctx.runQuery(internal.calendarSyncData.getChannel, { villaId: args.villaId });
    if (!channel || channel.status !== "active") return null;
    let token: string;
    try { token = await accessToken(); }
    catch (error) { await ctx.runMutation(internal.calendarSyncData.failSync, { villaId: args.villaId, channelId: channel.channelId, error: error instanceof Error ? error.message : "Unknown credential error" }); throw error; }
    await syncClaimedChannel(ctx, args.villaId, token);
    return null;
  },
});

export const renewExpiringChannels = internalAction({
  args: {}, returns: v.null(),
  handler: async (ctx) => {
    await ctx.runQuery(internal.calendarSyncData.getSyncState, {});
    const token = await accessToken(); const channels = await ctx.runQuery(internal.calendarSyncData.listChannels, {});
    for (const channel of channels) {
      if (channel.status !== "active" || channel.syncInProgress || (channel.channelExpiration ?? 0) > Date.now() + RENEW_BEFORE_MS) continue;
      const channelId = crypto.randomUUID(); const channelToken = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
      try {
        const watch = await watchCalendar(token, channel.calendarId, channelId, channelToken);
        const replaced = await ctx.runMutation(internal.calendarSyncData.renewChannel, { villaId: channel.villaId, expectedChannelId: channel.channelId, channelId, channelToken, ...watch });
        if (replaced) { try { await stopWatch(token, channel); } catch { /* new channel is already authoritative */ } }
        else await stopWatch(token, { channelId, resourceId: watch.resourceId });
      } catch (error) { await ctx.runMutation(internal.calendarSyncData.markChannelError, { villaId: channel.villaId, channelId: channel.channelId, error: error instanceof Error ? error.message : "Unknown subscription renewal error" }); }
    }
    return null;
  },
});

export const run = internalAction({
  args: { force: v.optional(v.boolean()), full: v.optional(v.boolean()) }, returns: calendarSyncResultValidator,
  handler: async (ctx, args) => {
    let calendarsProcessed = 0; let importedEvents = 0; const errors: string[] = [];
    try {
      await ctx.runQuery(internal.calendarSyncData.getSyncState, {});
      const token = await accessToken(); const lifecycle = await reconcileAll(ctx, token); importedEvents += lifecycle.imported; errors.push(...lifecycle.errors);
      const latest = await ctx.runQuery(internal.calendarSyncData.getSyncState, {});
      for (const { villa } of latest.calendars) {
        try { const claimed = await ctx.runMutation(internal.calendarSyncData.claimSync, { villaId: villa._id }); if (claimed) { importedEvents += await syncClaimedChannel(ctx, villa._id, token, args.full); calendarsProcessed += 1; } }
        catch (error) { errors.push(`${villa.nameEn}: ${error instanceof Error ? error.message : "Unknown sync error"}`); }
      }
      return { skipped: false, calendarsProcessed, importedEvents };
    } catch (error) { throw error; }
  },
});

export const syncNow = action({ args: {}, returns: calendarSyncResultValidator, handler: async (ctx): Promise<CalendarSyncResult> => { await ctx.runQuery(internal.calendarSyncData.requireSyncAccess, {}); return await ctx.runAction(internal.googleCalendar.run, { force: true, full: true }); } });
