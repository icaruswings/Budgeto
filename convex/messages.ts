import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const updateMessage = mutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query('messages').collect();
    if (messages.length === 0) {
      return await ctx.db.insert('messages', { text: args.message });
    } else {
      return await ctx.db.patch(messages[0]._id, { text: args.message });
    }
  },
});

export const getMessage = query({
  handler: async (ctx) => {
    const messages = await ctx.db.query('messages').collect();
    return messages[0]?.text ?? 'Hello World';
  },
});
