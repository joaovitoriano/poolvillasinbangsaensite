import { v } from "convex/values";
import { query } from "./_generated/server";
import { getSessionUser, requireUser, sessionUserValidator } from "./lib/access";

export const current = query({
  args: {},
  returns: v.union(v.null(), sessionUserValidator),
  handler: getSessionUser,
});

export const requireSession = query({
  args: {},
  returns: sessionUserValidator,
  handler: requireUser,
});
