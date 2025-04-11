import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  userSettings: defineTable({
    userId: v.string(),
    userEmail: v.string(),
    actualPayAmount: v.optional(v.number()),
    actualPayFrequency: v.optional(v.literal("monthly")),
    actualPayDayOfMonth: v.optional(v.number()),
    desiredPayFrequency: v.optional(v.literal("fortnightly")),
    desiredPayDayOfWeek: v.optional(v.string()),
    desiredPayAmount: v.optional(v.number()),
    nextPaydayTimestamp: v.optional(v.number()),
  }).index("by_userId", ["userId"])
    .index("by_userEmail", ["userEmail"]),

  bills: defineTable({
    userId: v.string(),
    name: v.string(),
    amount: v.number(),
    frequency: v.union(
        v.literal("monthly"),
        v.literal("fortnightly"),
        v.literal("weekly"),
        v.literal("one-off")
    ),
    dueDate: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  })
  .index("by_userId", ["userId"]),

  // Add other tables if needed
});