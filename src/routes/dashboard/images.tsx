import { createFileRoute } from '@tanstack/solid-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/solid-query';
import { For, Show, createSignal, createMemo } from 'solid-js';
import { toast } from 'solid-sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { convex } from '~/lib/convex';
import { api } from '../../../convex/_generated/api';
import { sessionQueryOptions } from '~/lib/auth-guard';

// Type for an image document from our DO
interface ImageDoc {
    id: string;
    _creationTime: number;
    userId: string;
    prompt: string;
    imageUrl: string;
    model?: string;
    seed?: number;
    steps?: number;
}

// Function to fetch images from our DO via the API
async function getImages(): Promise<ImageDoc[]> {
    const response = await fetch('/api/images');
    if (!response.ok) {
        throw new Error('Failed to fetch images');
    }
    return response.json();
}

function ImagesPage() {
    const queryClient = useQueryClient();
    const sessionQuery = useQuery(() => sessionQueryOptions());
	const user = createMemo(() => sessionQuery.data?.user);

    const [prompt, setPrompt] = createSignal('');
    const [imageUrl, setImageUrl] = createSignal('https://placehold.co/512x512/gray/white?text=My+Image');

    const imagesQuery = useQuery(() => ({
        queryKey: ['images', user()?.id],
        queryFn: getImages,
        enabled: !!user()?.id, // Only run query if user ID is available
    }));

    const addImageMutation = useMutation(() => ({
        mutationFn: async (newImage: { userId: string, prompt: string, imageUrl: string }) => {
            // 1. Save to Convex
            await convex.mutation(api.images.saveImage, newImage);
            
            // 2. Trigger DO Sync
            const syncResponse = await fetch('/api/images/sync', { method: 'POST' });

            if (!syncResponse.ok) {
                const errorData = await syncResponse.json().catch(() => ({ message: "Sync failed with a non-JSON response." }));
                throw new Error(errorData.message || 'The sync operation failed.');
            }
        },
        onSuccess: () => {
            // 3. Refetch from DO to update the UI
            queryClient.invalidateQueries({ queryKey: ['images', user()?.id] });
            setPrompt(''); // Clear form
        }
    }));

    const handleAddImage = (e: Event) => {
        e.preventDefault();
        if (!prompt().trim() || !imageUrl().trim() || !user()?.id) {
            toast.error("Prompt and Image URL are required.");
            return;
        }

        const promise = addImageMutation.mutateAsync({
            userId: user()!.id,
            prompt: prompt().trim(),
            imageUrl: imageUrl().trim()
        });

        toast.promise(promise, {
			loading: 'Saving and syncing image...',
			success: 'Image saved successfully!',
			error: (err: Error) => `Failed to save image: ${err.message}`
		});
    };

    return (
        <div class="container mx-auto max-w-4xl py-8 px-4 space-y-8">
            <div>
                <h1 class="text-3xl font-bold tracking-tight">Image Gallery</h1>
                <p class="text-muted-foreground mt-1">Add and view your generated images.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Image</CardTitle>
                    <CardDescription>Enter a prompt and a URL for your new image.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddImage} class="space-y-4">
                        <Input
                            name="prompt"
                            value={prompt()}
                            onChange={setPrompt}
                            placeholder="Enter a prompt..."
                            disabled={addImageMutation.isPending}
                        />
                         <Input
                            name="imageUrl"
                            value={imageUrl()}
                            onChange={setImageUrl}
                            placeholder="https://example.com/image.png"
                            disabled={addImageMutation.isPending}
                        />
                        <Button
                            type="submit"
                            disabled={addImageMutation.isPending || !prompt().trim()}
                        >
                            {addImageMutation.isPending ? 'Saving...' : 'Save Image'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div>
                <h2 class="text-2xl font-semibold tracking-tight mb-4">Your Images</h2>
                <Show when={imagesQuery.isLoading}>
                    <p>Loading images...</p>
                </Show>
                 <Show when={imagesQuery.isError}>
                    <p class="text-destructive">Error loading images: {imagesQuery.error?.message}</p>
                </Show>
                <Show when={imagesQuery.isSuccess && imagesQuery.data}>
                    <Show when={imagesQuery.data!.length === 0}>
                        <p class="text-muted-foreground">No images found. Add one above to get started!</p>
                    </Show>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <For each={imagesQuery.data}>
                            {(image) => (
                                <Card class="overflow-hidden">
                                    <img src={image.imageUrl} alt={image.prompt} class="w-full h-48 object-cover" />
                                    <CardContent class="p-4">
                                        <p class="text-sm font-medium truncate" title={image.prompt}>{image.prompt}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </For>
                    </div>
                </Show>
            </div>
        </div>
    );
}

export const Route = createFileRoute('/dashboard/images')({
  component: ImagesPage,
}); 