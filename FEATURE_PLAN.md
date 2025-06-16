# Image Storage Feature Implementation Plan

This document outlines the plan to implement a new feature for storing user-generated images. The architecture uses Convex as the primary database for writes and a Cloudflare Durable Object (DO) per user for fast, isolated reads.

## 1. Overview of the Architecture

The data flow is as follows:

1.  **Write Path**: The client calls a Convex mutation to save new image metadata (prompt, URL, etc.).
2.  **Sync Path**: After the Convex write succeeds, the client calls a new API endpoint on our Hono worker. This endpoint gets the user-specific Durable Object and triggers a `sync` command.
3.  **DO Sync Logic**: The Durable Object fetches the latest image data for that user from Convex. To avoid re-fetching all data, it will use a timestamp or cursor from its last successful sync. The new data is then written to the DO's internal SQLite database.
4.  **Read Path**: The client uses Tanstack Query to fetch image data from a new Hono API endpoint. This endpoint retrieves the data directly from the user's Durable Object, providing low-latency reads.

## 2. Convex Setup

### 2.1. Schema Modification (`convex/schema.ts`)

We will add a new `images` table to the schema.

```typescript
// convex/schema.ts

// ... existing schema ...
export default defineSchema({
  // ... existing tables
  images: defineTable({
    userId: v.string(), // Identifier from the auth system
    prompt: v.string(),
    imageUrl: v.string(),
    // Optional fields
    model: v.optional(v.string()),
    seed: v.optional(v.number()),
    steps: v.optional(v.number()),
  }).index("by_userId", ["userId"]),
});
```

### 2.2. New Convex Functions (`convex/images.ts`)

Create a new file `convex/images.ts` for image-related queries and mutations.

-   **`saveImage` (Mutation)**: Saves a new image record to the `images` table.
-   **`getImagesForUser` (Query)**: Fetches image records for a specific user, with support for fetching only records created after a given timestamp (cursor). This will be used by the Durable Object for syncing.

## 3. Durable Object (ImageStorageDO)

This is the core of the read path. Each user gets their own DO instance with its own SQLite database.

### 3.1. Wrangler Configuration (`wrangler.jsonc`)

We need to declare the new Durable Object and enable the SQLite backend for it.

```jsonc
// wrangler.jsonc
{
  // ... existing config ...
  "durable_objects": {
    "bindings": [
      {
        "name": "IMAGE_STORAGE_DO",
        "class_name": "ImageStorageDO"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": [
        "ImageStorageDO"
      ]
    }
  ]
}
```

### 3.2. Durable Object Implementation (`api/do/ImageStorageDO.ts`)

Create a new file for the DO class. We will use Drizzle ORM for type-safe SQLite access.

-   **Dependencies**: We'll need to install `drizzle-orm` and `drizzle-kit`.
-   **DB Schema**: Define a Drizzle schema for the `images` table in the DO's SQLite, mirroring the Convex schema.
-   **Migration Logic**: Implement a method to run Drizzle migrations upon DO creation/wakeup.
-   **Class Methods**:
    -   `constructor()`: Initializes the Drizzle instance with `ctx.storage`.
    -   `syncFromConvex()`:
        -   Retrieves the last sync timestamp from the DO's storage.
        -   Calls the `getImagesForUser` Convex query with the timestamp as a cursor.
        -   Upserts the new image data into its local SQLite database.
        -   Updates the last sync timestamp.
    -   `getImages()`: Queries the local SQLite database to return all images for the user.
    -   `deleteImage()`: (Future) Handles deleting an image from SQLite and potentially Convex.

## 4. API Layer (Hono)

We will add new routes to `api/index.ts` and modify its `Env` type.

### 4.1. Update Environment Types

Add the DO namespace to `api/types.ts` or directly in `api/index.ts`.

```typescript
// api/index.ts (or types.ts)
import type { ImageStorageDO } from './do/ImageStorageDO';

type Env = {
    // ... existing bindings
    IMAGE_STORAGE_DO: DurableObjectNamespace<ImageStorageDO>;
    // Add VITE_CONVEX_URL to bindings so we can access it
    VITE_CONVEX_URL: string;
};
```
Also add `IMAGE_STORAGE_DO` to `wrangler.jsonc`'s `vars` section if not already present, and ensure `VITE_CONVEX_URL` is available to the worker.

### 4.2. New API Endpoints

-   **`POST /api/images/sync`**:
    -   Authenticates the user.
    -   Gets the `userId` from the session.
    -   Gets the user's DO stub using `env.IMAGE_STORAGE_DO.idFromName(userId).get()`.
    -   Calls `stub.fetch()` to trigger the `syncFromConvex` method on the DO.
-   **`GET /api/images`**:
    -   Authenticates the user and gets their `userId`.
    -   Gets the user's DO stub.
    -   Calls `stub.fetch()` to trigger the `getImages` method on the DO and returns the result.

## 5. Client-Side (SolidJS)

### 5.1. New Components & Routes

-   Create a new route, e.g., `src/routes/dashboard/images.tsx`.
-   This route will contain a component that displays a gallery of the user's images.

### 5.2. Data Fetching (Tanstack Query)

-   Create a query with a key like `['images']` that calls our new `GET /api/images` endpoint.
-   The component will use this query to display the data.

### 5.3. Data Writing & Syncing Flow

-   When a user action generates an image:
    1.  Use the `useMutation` hook from `@tanstack/solid-query` to call the `saveImage` Convex mutation.
    2.  In the `onSuccess` callback of the Convex mutation:
        a.  Make a `POST` request to our `/api/images/sync` endpoint.
        b.  Upon success of the sync call, invalidate the `['images']` query using the `queryClient` to trigger a refetch, which will now get the updated list from the Durable Object.

## 6. Development Steps

1.  **Backend First**:
    1.  Implement Convex schema and functions.
    2.  Set up the Durable Object class, including schema and migration logic.
    3.  Update `wrangler.jsonc`.
    4.  Add the new Hono API endpoints.
2.  **Frontend**:
    1.  Create the new image gallery page and components.
    2.  Implement the Tanstack Query for fetching images.
    3.  Implement the mutation flow for saving and syncing new images.
3.  **Testing**:
    1.  Thoroughly test the end-to-end flow locally.
    2.  Verify that DOs are created per user and that data is synced correctly.
    3.  Verify that reads are coming from the DO and are fast. 