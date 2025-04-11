import { EventSchemas } from "inngest";
import { z } from "zod";

const UpdateMessageEventSent = z.object({
  name: z.literal("update-message/event.sent"),
  data: z.object({
    message: z.string(),
  }),
});

export const schemas = new EventSchemas().fromZod([UpdateMessageEventSent]);
