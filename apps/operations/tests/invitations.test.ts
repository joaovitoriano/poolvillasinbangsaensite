import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { setup } from "./helpers";
const service = vi.hoisted(() => ({ listUsers: vi.fn(), listOrganizationMemberships: vi.fn(), listInvitations: vi.fn(), sendInvitation: vi.fn() }));
vi.mock("@workos-inc/node", () => ({ WorkOS: class { userManagement = service; } }));
beforeEach(() => {
  vi.stubEnv("WORKOS_API_KEY", "test-only");
  vi.stubEnv("WORKOS_OPERATIONS_ORGANIZATION_ID", "org_test");
  vi.resetAllMocks();
  service.listUsers.mockResolvedValue({ data: [{ id: "agent", email: "agent@example.test" }] });
  service.listOrganizationMemberships.mockResolvedValue({ data: [{ organizationId: "org_test", status: "active", role: { slug: "org-agent" } }] });
  service.listInvitations.mockResolvedValue({ data: [] });
  service.sendInvitation.mockResolvedValue({ id: "invitation_test" });
});
afterEach(() => vi.unstubAllEnvs());
it("adds an existing member to a second villa without inviting them again", async () => {
  const f = await setup();
  expect(await f.admin.action(api.invitations.send, { villaId: f.secondVilla, email: " AGENT@example.test ", role: "agent" })).toEqual({ status: "added" });
  expect(service.sendInvitation).not.toHaveBeenCalled();
  expect((await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).members).toHaveLength(1);
  await expect(f.admin.action(api.invitations.send, { villaId: f.secondVilla, email: "agent@example.test", role: "agent" })).rejects.toThrow(/already has access/);
});
it("rejects unauthorized users and malformed email before contacting WorkOS", async () => {
  const f = await setup();
  await expect(f.agent.action(api.invitations.send, { villaId: f.secondVilla, email: "agent@example.test", role: "agent" })).rejects.toThrow();
  await expect(f.admin.action(api.invitations.send, { villaId: f.secondVilla, email: "invalid", role: "agent" })).rejects.toThrow(/valid email/);
  expect(service.listUsers).not.toHaveBeenCalled();
});
it("invites new members and reports duplicates without resending", async () => {
  const f = await setup(); service.listUsers.mockResolvedValue({ data: [] });
  const args = { villaId: f.secondVilla, email: "new@example.test", role: "agent" as const };
  expect(await f.admin.action(api.invitations.send, args)).toEqual({ status: "invited" });
  await expect(f.admin.action(api.invitations.send, args)).rejects.toThrow(/pending/);
  expect(service.sendInvitation).toHaveBeenCalledTimes(1);
});
it("preserves organization roles and handles service failures without granting access", async () => {
  const f = await setup(); const args = { villaId: f.secondVilla, email: "agent@example.test", role: "owner" as const };
  await expect(f.admin.action(api.invitations.send, args)).rejects.toThrow(/role does not match/);
  service.listUsers.mockRejectedValue(new Error("provider error"));
  await expect(f.admin.action(api.invitations.send, args)).rejects.toThrow(/Please try again/);
  expect((await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).members).toHaveLength(0);
});
it("applies access on first sign-in for a member with no local profile", async () => {
  const f = await setup();
  service.listUsers.mockResolvedValue({ data: [{ id: "new_user", email: "new@example.test" }] });
  await f.admin.action(api.invitations.send, { villaId: f.secondVilla, email: "new@example.test", role: "agent" });
  const user = f.t.withIdentity({ ...f.identity("agent"), tokenIdentifier: "new_user", subject: "new_user", email: "new@example.test" });
  await user.mutation(api.users.syncCurrent, {});
  expect((await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).members).toHaveLength(1);
  expect(service.sendInvitation).not.toHaveBeenCalled();
});
