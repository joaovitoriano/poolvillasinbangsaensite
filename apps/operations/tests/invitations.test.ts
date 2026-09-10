import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { setup } from "./helpers";
const service = vi.hoisted(() => ({ listUsers: vi.fn(), listOrganizationMemberships: vi.fn(), listInvitations: vi.fn(), sendInvitation: vi.fn(), getInvitation: vi.fn(), revokeInvitation: vi.fn() }));
vi.mock("@workos-inc/node", () => ({ WorkOS: class { userManagement = service; } }));
beforeEach(() => {
  vi.stubEnv("WORKOS_API_KEY", "test-only");
  vi.stubEnv("WORKOS_OPERATIONS_ORGANIZATION_ID", "org_test");
  vi.resetAllMocks();
  service.listUsers.mockResolvedValue({ data: [{ id: "agent", email: "agent@example.test" }] });
  service.listOrganizationMemberships.mockResolvedValue({ data: [{ organizationId: "org_test", status: "active", role: { slug: "org-agent" } }] });
  service.listInvitations.mockResolvedValue({ data: [] });
  service.sendInvitation.mockResolvedValue({ id: "invitation_test" });
  service.getInvitation.mockResolvedValue({ state: "pending" });
  service.revokeInvitation.mockResolvedValue({ state: "revoked" });
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
it("handles service failures without granting access", async () => {
  const f = await setup(); const args = { villaId: f.secondVilla, email: "agent@example.test", role: "owner" as const };
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

it("revokes a pending invitation and allows retry after a provider failure", async () => {
  const f = await setup(); service.listUsers.mockResolvedValue({ data: [] });
  await f.admin.action(api.invitations.send, { villaId: f.secondVilla, email: "new@example.test", role: "agent" });
  const invitation = (await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).invitations[0];
  await expect(f.agent.action(api.invitations.cancel, { invitationId: invitation._id })).rejects.toThrow();
  expect(service.getInvitation).not.toHaveBeenCalled();
  service.revokeInvitation.mockRejectedValueOnce(new Error("offline"));
  await expect(f.admin.action(api.invitations.cancel, { invitationId: invitation._id })).rejects.toThrow(/try again/);
  expect((await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).invitations).toHaveLength(1);
  await f.admin.action(api.invitations.cancel, { invitationId: invitation._id });
  expect((await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).invitations).toHaveLength(0);
  expect(service.revokeInvitation).toHaveBeenCalledWith("invitation_test");
});
it("cancels a first-sign-in access grant without calling WorkOS", async () => {
  const f = await setup(); service.listUsers.mockResolvedValue({ data: [{ id: "new_user", email: "new@example.test" }] });
  await f.admin.action(api.invitations.send, { villaId: f.secondVilla, email: "new@example.test", role: "agent" });
  const invitation = (await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).invitations[0];
  await f.admin.action(api.invitations.cancel, { invitationId: invitation._id });
  const user = f.t.withIdentity({ ...f.identity("agent"), tokenIdentifier: "new_user", subject: "new_user", email: "new@example.test" });
  await user.mutation(api.users.syncCurrent, {});
  expect((await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).members).toHaveLength(0);
  expect(service.revokeInvitation).not.toHaveBeenCalled();
});
it("removes only the selected villa assignment and records activity", async () => {
  const f = await setup();
  await f.admin.action(api.invitations.send, { villaId: f.secondVilla, email: "agent@example.test", role: "agent" });
  const member = (await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).members[0];
  await expect(f.agent.mutation(api.team.removeMember, { assignmentId: member._id })).rejects.toThrow();
  await f.admin.mutation(api.team.removeMember, { assignmentId: member._id });
  await expect(f.agent.query(api.villas.get, { villaId: f.secondVilla })).rejects.toThrow();
  expect(await f.agent.query(api.villas.get, { villaId: f.villaId })).not.toBeNull();
  expect((await f.activity()).page.some(row => row.entityId === member._id && row.action === "deleted")).toBe(true);
});
it("does not revoke an invitation that was accepted meanwhile", async () => {
  const f = await setup(); service.listUsers.mockResolvedValue({ data: [] });
  await f.admin.action(api.invitations.send, { villaId: f.secondVilla, email: "new@example.test", role: "agent" });
  const invitation = (await f.admin.query(api.team.listForVilla, { villaId: f.secondVilla })).invitations[0];
  service.getInvitation.mockResolvedValue({ state: "accepted" });
  await expect(f.admin.action(api.invitations.cancel, { invitationId: invitation._id })).rejects.toThrow(/accepted/);
  expect(service.revokeInvitation).not.toHaveBeenCalled();
});

it("allows a different role in each villa without changing the organization membership", async () => {
  const f = await setup();
  await f.admin.action(api.invitations.send, { villaId: f.secondVilla, email: "agent@example.test", role: "owner" });
  expect((await f.agent.query(api.villas.get, { villaId: f.villaId }))?.role).toBe("agent");
  await expect(f.agent.query(api.villas.get, { villaId: f.secondVilla })).rejects.toThrow();
  await f.agent.mutation(api.users.switchAccountMode, { mode: "owner" });
  expect((await f.agent.query(api.villas.get, { villaId: f.secondVilla }))?.role).toBe("owner");
  const range = { from: "2030-01-01", to: "2031-01-01" };
  await expect(f.agent.query(api.financials.villa, { villaId: f.villaId, ...range })).rejects.toThrow();
  expect((await f.agent.query(api.financials.villa, { villaId: f.secondVilla, ...range })).totals.bookingCount).toBe(0);
  expect(service.sendInvitation).not.toHaveBeenCalled();
});
