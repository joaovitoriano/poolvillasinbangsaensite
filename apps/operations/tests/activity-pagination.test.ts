import { expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { setup } from "./helpers";

it("pages only the latest 200 activities without deleting older records", async () => {
  const f = await setup();
  await f.t.run(async ctx => {
    for (let i = 0; i < 205; i++) await ctx.db.insert("activity", {
      actorId: f.users[0], actorName: "Test admin", entity: "villas", entityId: String(i), action: "updated", changes: [], createdAt: Date.now() + i + 1000,
    });
  });
  const before = (await f.counts()).activity;
  const ids: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const result = await f.admin.query(api.activity.list, { page });
    expect(result.pageCount).toBe(10);
    expect(result.page).toHaveLength(20);
    ids.push(...result.page.map((row: { entityId: string }) => row.entityId));
  }
  expect(ids).toEqual(Array.from({ length: 200 }, (_, i) => String(204 - i)));
  expect((await f.counts()).activity).toBe(before);
  for (const page of [0, -1, 1.5, 11]) await expect(f.admin.query(api.activity.list, { page })).rejects.toThrow();
  await expect(f.admin.query(api.activity.list, {} as never)).rejects.toThrow();
  await expect(f.admin.query(api.activity.list, { page: "1" } as never)).rejects.toThrow();
  for (const caller of [f.owner, f.agent, f.t]) await expect(caller.query(api.activity.list, { page: 1 })).rejects.toThrow();
});
it("clamps a page beyond the available records", async () => {
  const f = await setup();
  const result = await f.admin.query(api.activity.list, { page: 10 });
  expect(result.currentPage).toBe(1);
  expect(result.pageCount).toBe(1);
});
