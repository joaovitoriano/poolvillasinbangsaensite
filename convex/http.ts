import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/webhooks/google-calendar",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceId = request.headers.get("x-goog-resource-id");
    const channelToken = request.headers.get("x-goog-channel-token");
    const resourceState = request.headers.get("x-goog-resource-state");
    const rawMessageNumber = request.headers.get("x-goog-message-number");
    if (!channelId || !resourceId || !channelToken || !resourceState)
      return new Response("Missing Google Calendar notification headers", { status: 400 });
    const parsedMessageNumber = rawMessageNumber ? Number(rawMessageNumber) : undefined;
    if (parsedMessageNumber !== undefined && (!Number.isSafeInteger(parsedMessageNumber) || parsedMessageNumber < 0))
      return new Response("Invalid Google Calendar message number", { status: 400 });
    const result = await ctx.runMutation(internal.calendarSyncData.receiveNotification, {
      channelId,
      resourceId,
      channelToken,
      resourceState,
      messageNumber: parsedMessageNumber,
    });
    if (result === "rejected") return new Response("Notification channel rejected", { status: 403 });
    return new Response(null, { status: 204 });
  }),
});

export default http;
