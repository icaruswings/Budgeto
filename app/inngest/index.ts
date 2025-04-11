// app/inngest/index.ts
// Uncomment import for scheduleNotifications
import { scheduleNotifications } from "./functions/scheduleNotifications";
import { sendPaydayNotification } from "./functions/sendPaydayNotification";

// Uncomment scheduleNotifications in the exported array
export const functions = [scheduleNotifications, sendPaydayNotification];

export { inngest } from "./client";
