// app/inngest/functions/scheduleNotifications.ts
import { inngest } from "~/inngest/client";
import { api } from "../../../convex/_generated/api";
// ... (keep other necessary imports if file is used elsewhere, otherwise comment out)
import { Id } from "../../../convex/_generated/dataModel";
import { addDays } from "date-fns";
import { sendPaydayNotification } from "./sendPaydayNotification";
import convex from "~/lib/convex.server";

// Define the payload structure expected from the user/settings.updated event trigger
// This might need adjustment based on how the event is actually sent
interface SettingsUpdatedPayload {
  userId: string;
  userSettingsId: Id<"userSettings">;
  // Include other relevant fields if the event payload is richer
}

// Define the data structure for the invoked sendPaydayNotification function
interface SendNotificationInvokePayload {
  userId: string;
  userEmail: string | null; // Handle possibility of missing email
  targetAmount: number | null; // desiredPayAmount can be null/undefined
  payday: string; // ISO string format
}

// Function definition
export const scheduleNotifications = inngest.createFunction(
  // Add concurrency control based on user ID
  {
    id: "schedule-notifications",
    name: "Schedule Payday Notifications",
    concurrency: {
      limit: 1,
      // Use a key expression to limit concurrency per user
      key: "event.data.userId", 
    },
  },
  { event: "user/settings.updated" },
  async ({ event, step }) => {
    // Log the event data immediately to check the concurrency key value
    console.log(`[scheduleNotifications] Event Received. Data for Key Check:`, event.data);
    
    const { userId, userSettingsId } = event.data as SettingsUpdatedPayload;

    console.log(`[scheduleNotifications] Run starting for userId: ${userId}, settingsId: ${userSettingsId}`);

    // Step 1: Fetch settings (remains the same)
    const userSettings = await step.run("fetch-user-settings", async () => {
      console.log(`[scheduleNotifications] Fetching settings ${userSettingsId}`);
      return await convex.query(api.userSettings.getById, { userSettingsId });
    });

    // Step 2: Remove the non-functional cancellation logic
    /*
    const sleepStepName = `wait-for-notification-${userId}`;
    await step.run("cancel-existing-schedules", async () => {
      console.log(`[scheduleNotifications] Attempting to cancel existing schedules for user ${userId}`);
      try {
        // Cancellation logic commented out previously
        console.warn(`[scheduleNotifications] Cancellation logic removed in favor of concurrency control.`);
      } catch (error: unknown) {
         // ... error handling ...
      }
    });
    */

    // Step 3: Validate settings (remains the same)
    if (!userSettings || !userSettings.nextPaydayTimestamp || !userSettings.userEmail) {
      console.log(
        `[scheduleNotifications] Settings invalid or missing required fields for user ${userId}. Cancelling notification scheduling.`,
        {
            hasSettings: !!userSettings,
            hasTimestamp: !!userSettings?.nextPaydayTimestamp,
            hasEmail: !!userSettings?.userEmail
        }
      );
      // No valid settings or next payday, so we don't schedule anything further.
      return {
        message: `Notification scheduling cancelled for user ${userId} due to invalid/missing settings.`,
      };
    }

    // Step 4: Calculate notification date (e.g., 2 days before payday)
    let notificationDate: Date;
    try {
        // Assuming nextPaydayTimestamp is stored as a number (Unix ms)
        const paydayDate = new Date(userSettings.nextPaydayTimestamp);
        notificationDate = addDays(paydayDate, -2); // TODO: Make notification lead time configurable?
        console.log(`[scheduleNotifications] Calculated notification date for user ${userId}: ${notificationDate.toISOString()}`);
    } catch (e) {
        console.error(`[scheduleNotifications] Error parsing nextPaydayTimestamp (${userSettings.nextPaydayTimestamp}) for user ${userId}:`, e);
        throw new Error("Failed to calculate notification date.");
    }

    // Step 5: Schedule the sleep step (use a standard name, concurrency handles uniqueness)
    console.log(`[scheduleNotifications] Scheduling sleep until ${notificationDate.toISOString()} for user ${userId}`);
    // Using a simpler step ID name as concurrency manages uniqueness per user
    await step.sleepUntil("wait-for-notification", notificationDate); 

    // Step 6: Invoke send function (remains the same)
    console.log(`[scheduleNotifications] Sleep completed. Invoking send-payday-notification for user ${userId}`);
    const invokePayload: SendNotificationInvokePayload = {
      userId: userId,
      userEmail: userSettings.userEmail, // Already validated this exists
      // Use desiredPayAmount, which should now be in the schema and populated
      targetAmount: userSettings.desiredPayAmount ?? null, 
      payday: new Date(userSettings.nextPaydayTimestamp).toISOString(), // Pass payday as ISO string
    };

    await step.invoke("send-payday-notification", {
      function: sendPaydayNotification, // Reference the imported function directly
      data: invokePayload, // Pass the structured payload
    });

    console.log(`[scheduleNotifications] Successfully invoked send-payday-notification for user ${userId}`);
    return {
      message: `Notification scheduled for user ${userId} on ${notificationDate.toISOString()}`,
    };
  }
); 