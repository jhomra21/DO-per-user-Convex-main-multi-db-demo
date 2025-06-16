import { type DurableObjectNamespace, type DurableObjectState, type DurableObject, type Request } from '@cloudflare/workers-types';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Type for an image document from our DO
interface ImageDoc {
    _id: string;
    _creationTime: number;
    userId: string;
    prompt: string;
    imageUrl: string;
    model?: string;
    seed?: number;
    steps?: number;
}

export interface Env {
    // This is the binding to the Durable Object itself.
    IMAGE_STORAGE_DO: DurableObjectNamespace;
    // This will be the URL for your Convex deployment.
    // Make sure to set this in your .dev.vars and as a secret in production.
    VITE_CONVEX_URL: string;
}

export class ImageStorageDO implements DurableObject {
    state: DurableObjectState;
    env: Env;
    initialized: boolean;
    convex: ConvexHttpClient;
    userId: string;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
        this.initialized = false;
        this.convex = new ConvexHttpClient(env.VITE_CONVEX_URL);
        this.userId = this.state.id.name;

        // Block concurrent operations while we initialize.
        this.state.blockConcurrencyWhile(async () => {
            if (this.initialized) return;

            // Check if we've done the one-time initial sync for this DO instance.
            const hasSynced = await this.state.storage.get("initialSyncComplete");
            if (!hasSynced) {
                await this._syncFromConvex();
                await this.state.storage.put("initialSyncComplete", true);
            }
            this.initialized = true;
        });
    }

    /**
     * Fetches images from Convex and writes them to the DO's storage using KV .put().
     */
    async _syncFromConvex() {
        const imagesFromConvex = await this.convex.query(api.images.getImagesForUser, { userId: this.userId });
        
        if (!imagesFromConvex || imagesFromConvex.length === 0) {
            return; // Nothing to sync
        }

        // Use a Record to batch writes with put()
        const imageRecord: Record<string, ImageDoc> = {};
        for (const image of imagesFromConvex) {
            imageRecord[image._id] = image as ImageDoc;
        }
        await this.state.storage.put(imageRecord);
    }
    
    async fetch(request: Request): Promise<Response> {
        // We can trust initialization to be complete due to blockConcurrencyWhile.
        const url = new URL(request.url);

        switch (url.pathname) {
            case "/sync": {
                try {
                    await this._syncFromConvex();
                    return new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e: any) {
                    return new Response(JSON.stringify({ success: false, error: e.message }), { 
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            case "/": {
                // Read from the DO's internal storage using KV list().
                const imagesMap = await this.state.storage.list<ImageDoc>();
                // Filter out the sync flag and convert the Map to an array.
                const imageArray = Array.from(imagesMap.values()).filter(val => typeof val === 'object');
                
                return new Response(JSON.stringify(imageArray), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            default:
                return new Response("Not found", { status: 404 });
        }
    }
} 