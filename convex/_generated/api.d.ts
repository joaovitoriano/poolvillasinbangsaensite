/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminDashboard from "../adminDashboard.js";
import type * as adminVillas from "../adminVillas.js";
import type * as auth from "../auth.js";
import type * as availability from "../availability.js";
import type * as bookingRequests from "../bookingRequests.js";
import type * as calendarSyncData from "../calendarSyncData.js";
import type * as crons from "../crons.js";
import type * as googleCalendar from "../googleCalendar.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_amenities from "../lib/amenities.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_boundedData from "../lib/boundedData.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_documentValidators from "../lib/documentValidators.js";
import type * as lib_googleCalendar from "../lib/googleCalendar.js";
import type * as lib_line from "../lib/line.js";
import type * as lib_notificationContent from "../lib/notificationContent.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_validators from "../lib/validators.js";
import type * as notifications from "../notifications.js";
import type * as photoVariantBackfill from "../photoVariantBackfill.js";
import type * as photoVariantBackfillData from "../photoVariantBackfillData.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as villaEditor from "../villaEditor.js";
import type * as villas from "../villas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminDashboard: typeof adminDashboard;
  adminVillas: typeof adminVillas;
  auth: typeof auth;
  availability: typeof availability;
  bookingRequests: typeof bookingRequests;
  calendarSyncData: typeof calendarSyncData;
  crons: typeof crons;
  googleCalendar: typeof googleCalendar;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/amenities": typeof lib_amenities;
  "lib/audit": typeof lib_audit;
  "lib/boundedData": typeof lib_boundedData;
  "lib/dates": typeof lib_dates;
  "lib/documentValidators": typeof lib_documentValidators;
  "lib/googleCalendar": typeof lib_googleCalendar;
  "lib/line": typeof lib_line;
  "lib/notificationContent": typeof lib_notificationContent;
  "lib/pricing": typeof lib_pricing;
  "lib/validators": typeof lib_validators;
  notifications: typeof notifications;
  photoVariantBackfill: typeof photoVariantBackfill;
  photoVariantBackfillData: typeof photoVariantBackfillData;
  seed: typeof seed;
  settings: typeof settings;
  villaEditor: typeof villaEditor;
  villas: typeof villas;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
