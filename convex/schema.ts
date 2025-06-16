import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }).index("by_text", ["text"]),
  images: defineTable({
    userId: v.string(),
    prompt: v.string(),
    imageUrl: v.string(),
    model: v.optional(v.string()),
    seed: v.optional(v.number()),
    steps: v.optional(v.number()),
  }).index("by_userId", ["userId"]),
  // Define other tables here if needed
}); 