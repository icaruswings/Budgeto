import { api } from "convex/_generated/api";
import { inngest } from "./client";
import convex from "~/lib/convex.server";

export default inngest.createFunction(
  { id: "update-message" },
  { event: "update-message/event.sent" },
  async ({ event, step }) => {
    const { message } = event.data;

    const result = await step.run('Update message in Convex', async () => {
      return await convex.mutation(api.messages.updateMessage, { message });
    });

    return { result };
  }
);
