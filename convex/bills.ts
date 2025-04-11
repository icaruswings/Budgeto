// convex/bills.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
// import { Id } from "./_generated/dataModel"; // Removed unused Id

// Import helper for authentication
import { getUserFromAuthSession } from "./lib/getUserFromAuthSession";

// --- Bill Argument Validation (Example for addBill) ---
// We can define reusable validators or define args inline in mutations/queries
const billArgs = {
    userId: v.string(), // Added userId argument for server-side calls
    name: v.string(),
    amount: v.number(),
    frequency: v.union(
        v.literal("monthly"),
        v.literal("fortnightly"),
        v.literal("weekly"),
        v.literal("one-off")
    ),
    dueDate: v.optional(v.number()),
    isActive: v.optional(v.boolean()), // isActive will likely default to true
};

// --- Queries --- 

// Query to list active bills for the current user
export const listActiveBills = query({
    args: {},
    handler: async (ctx) => {
        console.log("server identity", await ctx.auth.getUserIdentity());

        const user = await getUserFromAuthSession(ctx);
        if (!user) {
            console.warn("User not authenticated, cannot list bills.");
            return []; // Return empty array if no user
        }
        // Fetch bills for the user where isActive is true or not explicitly set to false
        return await ctx.db
            .query('bills')
            .withIndex('by_userId', q => q.eq('userId', user.subject))
            // Filter out bills explicitly marked as inactive
            .filter(q => q.neq(q.field('isActive'), false)) 
            .order("desc") // Order by creation time descending
            .collect();
    },
});

// Query to list active bills for a specific user ID (for server-side use)
export const listActiveBillsByUserId = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        // No auth check here - assumes caller (Remix loader) is authenticated
        if (!args.userId) {
             console.warn("userId not provided to listActiveBillsByUserId");
            return [];
        }
        return await ctx.db
            .query('bills')
            .withIndex('by_userId', q => q.eq('userId', args.userId))
            .filter(q => q.neq(q.field('isActive'), false))
            .order("desc")
            .collect();
    },
});

// --- Mutations --- 

// Mutation to add a new bill
export const addBill = mutation({
    args: billArgs, 
    handler: async (ctx, args) => {
        // No auth check here - assuming caller (Remix action) provides authenticated userId
        // const user = await getUserFromAuthSession(ctx);
        // if (!user) {
        //     throw new Error("Authentication required to add a bill.");
        // }

        // Validate userId was passed
        if (!args.userId) {
            throw new Error("Internal Server Error: userId missing in addBill mutation call.");
        }

        // Insert the new bill, using the provided userId
        const billId = await ctx.db.insert("bills", { 
            userId: args.userId, // Use provided userId
            isActive: args.isActive ?? true, // Default isActive to true if not provided
            name: args.name,
            amount: args.amount,
            frequency: args.frequency,
            dueDate: args.dueDate, 
        });
        return billId;
    },
});

// Mutation to update an existing bill
export const updateBill = mutation({
    args: { 
        billId: v.id("bills"), 
        userId: v.string(), // Added userId argument
        // Optional fields for patching
        name: v.optional(v.string()),
        amount: v.optional(v.number()),
        frequency: v.optional(v.union(
            v.literal("monthly"),
            v.literal("fortnightly"),
            v.literal("weekly"),
            v.literal("one-off")
        )),
        dueDate: v.optional(v.number()), // Allow sending null/undefined to clear
        isActive: v.optional(v.boolean()),
    }, 
    handler: async (ctx, args) => {
        // No auth check here - assuming caller (Remix action) provides authenticated userId
        // const user = await getUserFromAuthSession(ctx);
        // if (!user) {
        //     throw new Error("Authentication required to update a bill.");
        // }

        // Validate userId was passed
        if (!args.userId) {
            throw new Error("Internal Server Error: userId missing in updateBill mutation call.");
        }

        const { billId, userId, ...updates } = args; // Destructure userId out

        // Verify ownership before patching
        const existingBill = await ctx.db.get(billId);
        if (!existingBill) {
            throw new Error("Bill not found.");
        }
        // Use the passed userId for ownership check
        if (existingBill.userId !== userId) {
            throw new Error("Unauthorized: You can only update your own bills.");
        }

        // Patch the bill with the provided updates 
        // Ensure dueDate is handled correctly (allow unsetting)
        const updateData = { ...updates };
        if (args.dueDate === null) {
          updateData.dueDate = undefined; // Explicitly unset if null is passed
        }
        await ctx.db.patch(billId, updateData);
        return billId; // Return ID on successful update
    },
});

// Mutation to delete a bill
export const deleteBill = mutation({
    args: {
        billId: v.id("bills"),
        userId: v.string(), // Added userId argument
    },
    handler: async (ctx, args) => {
        // No auth check here - assuming caller (Remix action) provides authenticated userId
        // const user = await getUserFromAuthSession(ctx);
        // if (!user) {
        //     throw new Error("Authentication required to delete a bill.");
        // }

        // Validate userId was passed
        if (!args.userId) {
            throw new Error("Internal Server Error: userId missing in deleteBill mutation call.");
        }
        
        // Verify ownership before deleting
        const existingBill = await ctx.db.get(args.billId);
        if (!existingBill) {
            throw new Error("Bill not found."); 
        }
        // Use the passed userId for the ownership check
        if (existingBill.userId !== args.userId) {
            throw new Error("Unauthorized: You can only delete your own bills.");
        }

        // Delete the bill
        await ctx.db.delete(args.billId);
        return args.billId; // Return ID on successful delete
    },
}); 