import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons=cronJobs();
crons.interval("renew Google Calendar notification channels", { hours: 1 }, internal.googleCalendar.renewExpiringChannels, {});
crons.cron("daily Google Calendar safety reconciliation", "15 20 * * *", internal.googleCalendar.run, { full: true });
export default crons;
