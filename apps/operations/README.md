# Pool Villas Operations

The operations dashboard is a separate Next.js app at `/ops`. The public website remains at the repository root. Each app has its own Vercel project, Convex database, and WorkOS organization.

## Environment configuration

Copy `.env.example` to `.env.local` inside this directory for local use. Supply this app's credentials and deployment URL there. The root website's `.env.local` is not loaded by operations scripts. Never commit real environment files, tokens, or deployment keys.

For production, configure variables in the operations Vercel project, whose root directory is `apps/operations`. Set `NEXT_PUBLIC_CONVEX_URL` to its production database and `NEXT_PUBLIC_WORKOS_REDIRECT_URI` to the public HTTPS `/ops/auth/callback` URL registered in WorkOS. Use a separate random `WORKOS_COOKIE_PASSWORD` and the operations cookie name. Configure `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, and `WORKOS_OPERATIONS_ORGANIZATION_ID` independently on the operations Convex deployment. Keep secret values out of `NEXT_PUBLIC_*` variables.

Do not set a development `CONVEX_DEPLOYMENT` or development database URL in production. A Convex deployment key, when used by CI, belongs in the deployment service's secret store. No seed, reset, or data-repair functions are shipped.

## Commands

From the repository root:

```sh
pnpm dev:operations
pnpm dev:operations:backend
pnpm typecheck:operations
pnpm test:operations
pnpm build:operations
```

For local microfrontend routing, set the proxy callback in the ignored `apps/operations/.env.proxy.local`, then run `pnpm dev`, `pnpm dev:operations:proxy`, and `pnpm dev:microfrontends` separately. Register the local callback URL with WorkOS.

## Access

Operations administrators manage all villas and see all financials and activity. Owners see assigned villas and their financials. Agents see assigned villas, their own financial totals, and masked contact information on other users' bookings. Owners and agents edit only their own bookings. Convex enforces permissions and villa access; hidden navigation alone is not authorization.

Tests run the real backend handlers with isolated in-memory data. See `tests/README.md` for coverage and limitations. Build output, local credentials, and generated installer state are excluded from Git; tests and the generated Convex API bindings belong in the repository.
