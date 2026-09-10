/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as bookings from "../bookings.js";
import type * as calendar from "../calendar.js";
import type * as closedDates from "../closedDates.js";
import type * as commissionPreferences from "../commissionPreferences.js";
import type * as financials from "../financials.js";
import type * as guests from "../guests.js";
import type * as invitations from "../invitations.js";
import type * as lib_activity from "../lib/activity.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_bookingRecords from "../lib/bookingRecords.js";
import type * as lib_closedDates from "../lib/closedDates.js";
import type * as lib_commission from "../lib/commission.js";
import type * as lib_discount from "../lib/discount.js";
import type * as lib_guests from "../lib/guests.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as overview from "../overview.js";
import type * as pricing from "../pricing.js";
import type * as team from "../team.js";
import type * as users from "../users.js";
import type * as villas from "../villas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  bookings: typeof bookings;
  calendar: typeof calendar;
  closedDates: typeof closedDates;
  commissionPreferences: typeof commissionPreferences;
  financials: typeof financials;
  guests: typeof guests;
  invitations: typeof invitations;
  "lib/activity": typeof lib_activity;
  "lib/auth": typeof lib_auth;
  "lib/bookingRecords": typeof lib_bookingRecords;
  "lib/closedDates": typeof lib_closedDates;
  "lib/commission": typeof lib_commission;
  "lib/discount": typeof lib_discount;
  "lib/guests": typeof lib_guests;
  "lib/pricing": typeof lib_pricing;
  overview: typeof overview;
  pricing: typeof pricing;
  team: typeof team;
  users: typeof users;
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

export declare const components: {};
