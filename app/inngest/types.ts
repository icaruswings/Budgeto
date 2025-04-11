import { Id } from "../../convex/_generated/dataModel"; // Adjust path as needed
import { EventSchemas } from "inngest";
import { z } from "zod"; // Import Zod

// Define the Zod schema for the settings updated event payload
// We use z.custom<Id<"userSettings">>() for the Convex ID type
// This assumes you handle potential validation elsewhere or trust the event source.
// A stricter approach might use z.string() if you don't need the branded type here.
const UserSettingsUpdatedPayloadSchema = z.object({
    userId: z.string(),
    userSettingsId: z.custom<Id<"userSettings">>(), 
    // Add other fields if your event actually sends more data
});

// Define the Zod schema for the event itself
const UserSettingsUpdatedEventSchema = z.object({
    name: z.literal("user/settings.updated"),
    data: UserSettingsUpdatedPayloadSchema,
});

// Export the schemas using fromZod
// Include any other event schemas you define here
export const eventSchemas = new EventSchemas().fromZod([
    UserSettingsUpdatedEventSchema,
    // Add other Zod event schemas here, e.g.:
    // AppUserCreatedEventSchema,
]);

// Remove the potentially incorrect/unnecessary Events type export
/*
export type Events = Parameters<typeof eventSchemas.parse>[0];
*/
