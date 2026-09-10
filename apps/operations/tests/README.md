# Operations automated tests

Run `pnpm test:operations` from the repository root, or `pnpm test` in `apps/operations`.

Vitest and convex-test execute the real Convex functions and argument validators against an isolated in-memory database. No deployment, real account, email, or live booking is modified. Each test starts with fresh users and villas; the clock is fixed for date-sensitive behavior.

Coverage includes valid and malformed bookings, missing arguments, numeric boundaries, overlap prevention, user/villa commission preferences, authentication and role restrictions, contact masking, financial scope and cancellations, closed-date conversion and transaction rollback, activity snapshots, profile changes, and pricing modes.

These tests cover backend behavior. They do not certify browser layouts, English/Thai rendering, clipboard permissions, real WorkOS login/invitations, or deployed-network/concurrency behavior. Those require separate browser and integration coverage. A passing suite is not proof that every possible application input has been tested.
