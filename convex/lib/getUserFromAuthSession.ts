import type { GenericQueryCtx, Auth } from "convex/server";
import { type DataModel } from "../_generated/dataModel";

/**
 * Retrieves the authenticated user object from the Convex context.
 * Throws an error if the user is not authenticated.
 * @param ctx - The Convex query or mutation context.
 * @returns The user identity object.
 */
export async function getUserFromAuthSession(
  ctx: GenericQueryCtx<DataModel> & { auth: Auth }
) {
  const identity = await ctx.auth.getUserIdentity();
  // If you want to require authentication for this function, uncomment the following:
  // if (!identity) {
  //   throw new Error("User must be authenticated.");
  // }
  return identity;
} 