import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserFromAuthSession } from "./lib/getUserFromAuthSession";
// import { Id } from "./_generated/dataModel"; // Removed unused import
// Re-enable calculation imports
import { calculateAnnualSalary, calculateTargetCycleAmount } from "../app/lib/payCalculations";

// Query to get user settings for the logged-in user - uses auth context
export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromAuthSession(ctx);
    if (!user) {
      return null; 
    }
    // Return settings directly without modification
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
      .unique();
    return settings;
  },
});

// Get user settings for the currently logged-in user
export const getLoggedIn = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromAuthSession(ctx);
    if (!user) {
      return null; // Or throw an error if user should always be defined
    }

    // Just return the settings directly
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
      .unique();
    return settings;
  },
});

// Get user settings by userId (for use by external systems like Remix loaders/actions)
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Removed auth checks - Assuming caller (Remix loader) is authenticated
    // and has provided the correct userId.

    // Fetch settings directly using the provided userId.
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    return settings;
  },
});

// Get user settings by document ID (for use by internal systems like Inngest)
// TODO: Secure this endpoint appropriately if needed (e.g., internal function or API key)
export const getById = query({
  args: { userSettingsId: v.id("userSettings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userSettingsId);
  },
});

// Mutation to create or update user settings - takes userId/email as args
export const upsert = mutation({
  args: {
    userId: v.string(), // Passed from authenticated Remix action
    userEmail: v.string(),
    actualPayAmount: v.optional(v.number()),
    actualPayFrequency: v.optional(v.literal("monthly")), // Actual is monthly
    actualPayDayOfMonth: v.optional(v.number()),
    // desiredPayFrequency removed, implicitly fortnightly
    desiredPayDayOfWeek: v.optional(v.string()), // Still required for fortnightly
    desiredPayAmount: v.optional(v.number()), // Schema expects number | undefined
    nextPaydayTimestamp: v.optional(v.number()), // Expect ms timestamp from action
  },
  handler: async (ctx, args) => {
    // Removed initial auth check based on ctx.
    // Assuming the caller (Remix action) has already authenticated the user
    // and is passing the correct, verified userId.

    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    // Recalculate desired amount based on potentially updated actuals, using fixed fortnightly
    const annualSalary = calculateAnnualSalary(args.actualPayAmount, "monthly"); // Always use monthly
    const desiredAmountCalculated = annualSalary
        ? calculateTargetCycleAmount(annualSalary, "fortnightly") // Always use fortnightly
        : null; 
            
    const desiredAmountForDb = desiredAmountCalculated ?? args.desiredPayAmount ?? undefined;

    // Prepare data, ensuring only monthly actual and fortnightly desired frequencies are used
    type UserSettingsInsert = Omit<typeof args, 'desiredPayAmount'> & { 
        actualPayFrequency: "monthly",
        desiredPayFrequency: "fortnightly", 
        desiredPayAmount?: number 
    };

    const dataToSave: UserSettingsInsert = {
      userId: args.userId,
      userEmail: args.userEmail,
      actualPayAmount: args.actualPayAmount,
      actualPayFrequency: "monthly" as const, 
      actualPayDayOfMonth: args.actualPayDayOfMonth,
      desiredPayFrequency: "fortnightly" as const, 
      desiredPayDayOfWeek: args.desiredPayDayOfWeek,
      desiredPayAmount: desiredAmountForDb, 
      nextPaydayTimestamp: args.nextPaydayTimestamp, 
    };

    if (existingSettings) {
      // Patch existing settings
      await ctx.db.patch(existingSettings._id, { ...dataToSave }); 
      return existingSettings._id;
    } else {
      // Create new settings
      const newSettingsId = await ctx.db.insert("userSettings", dataToSave);
      return newSettingsId;
    }
  },
}); 