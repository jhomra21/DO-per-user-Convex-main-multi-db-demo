import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Saves a new image to the database.
 */
export const saveImage = mutation({
  args: {
    userId: v.string(),
    prompt: v.string(),
    imageUrl: v.string(),
    model: v.optional(v.string()),
    seed: v.optional(v.number()),
    steps: v.optional(v.number()),
  },
  returns: v.id("images"),
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("images", {
        userId: args.userId,
        prompt: args.prompt,
        imageUrl: args.imageUrl,
        model: args.model,
        seed: args.seed,
        steps: args.steps,
    });
    return imageId;
  },
});

/**
 * Gets all images for a specific user.
 * Includes a cursor for pagination to only fetch new images.
 */
export const getImagesForUser = query({
  args: { 
    userId: v.string(),
    cursor: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // This is a simplified example. In a real-world scenario, you'd likely
    // want to paginate this query. For the DO sync, we can filter by creation time
    // if we store it, or use pagination cursors.
    // For now, we will fetch all images and the DO will be responsible for diffing.
    // A more advanced implementation would use the cursor to fetch only new documents.
    const images = await ctx.db
      .query("images")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return images;
  },
}); 