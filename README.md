# Pool Villas in Bangsaen

Bilingual customer website and lightweight booking-request management system built with Next.js, React, TypeScript, and Convex.

The website shows live availability and estimated nightly pricing. A submitted request does **not** confirm a booking, hold dates, collect payment, or block the calendar. The owner follows up personally by LINE or phone.

## Local development

```bash
pnpm install
pnpm exec convex dev
pnpm dev
```

Open `http://localhost:3000/en` for the English website, `/th` for Thai, and `/admin` for management.

The active development backend is the separate Convex project `poolvillasinbangsaen-clean`. Do not point this project at Villa Manager or the retired website deployment.

## Required local environment

Create `.env.local` with:

```dotenv
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

WORKOS_CLIENT_ID=client_...
WORKOS_API_KEY=sk_...
WORKOS_COOKIE_PASSWORD=a-secret-at-least-32-characters-long
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
```

Configure that callback URL and `http://localhost:3000/sign-in` as the sign-in URL in WorkOS.

Set secure backend variables with `pnpm exec convex env set NAME value`:

```text
WORKOS_CLIENT_ID
WORKOS_ORGANIZATION_ID
PUBLIC_SITE_URL
RESEND_API_KEY
NOTIFICATION_FROM_EMAIL
LINE_CHANNEL_ACCESS_TOKEN
LINE_OWNER_USER_ID # optional fallback recipient; normally configured in Business settings
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
```

Administrator access is managed entirely in WorkOS. Assign the `admin` or `superadmin` role to the user's organization membership; Convex reads those signed role claims directly from the AuthKit access token.

Email recipients and the LINE recipient user ID are managed in **Business settings**. Provider secrets stay in Convex environment variables and are never returned by public settings queries.

Google OAuth only needs read access to Calendar events. Give each villa its Google Calendar ID in **Villas & rates → Details**, then enable synchronization in **Business settings**. Google Calendar change notifications trigger incremental synchronization, and a low-frequency reconciliation recovers missed notifications. Google Calendar is the sole source of availability: every event blocks its date range, and an event whose title contains the uppercase word `CLOSED` is shown as a closure instead of a booking. Synchronization never creates, edits, or deletes Google Calendar events.

## Verification

```bash
pnpm exec convex dev --once
pnpm typecheck
pnpm lint
pnpm build
```

Verify changed behavior manually through the browser in both English and Thai, including the relevant success and failure or recovery states.
