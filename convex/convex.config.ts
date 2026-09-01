import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    RESEND_API_KEY: v.optional(v.string()),
    NOTIFICATION_FROM_EMAIL: v.optional(v.string()),
    LINE_CHANNEL_ACCESS_TOKEN: v.optional(v.string()),
    LINE_OWNER_USER_ID: v.optional(v.string()),
    GOOGLE_CLIENT_ID: v.optional(v.string()),
    GOOGLE_CLIENT_SECRET: v.optional(v.string()),
    GOOGLE_TOKEN_ENCRYPTION_KEY: v.optional(v.string()),
    CONVEX_SITE_URL: v.optional(v.string()),
    WORKOS_CLIENT_ID: v.string(),
    WORKOS_ORGANIZATION_ID: v.string(),
    PUBLIC_SITE_URL: v.optional(v.string()),
  },
});

app.use(rateLimiter);

export default app;
