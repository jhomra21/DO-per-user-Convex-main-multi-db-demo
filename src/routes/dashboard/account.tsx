import { createFileRoute, useRouteContext } from '@tanstack/solid-router';
import { createSignal, createMemo, Show } from 'solid-js';
import { useMutation, useQueryClient } from '@tanstack/solid-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { authClient } from '~/lib/auth-client';

function getInitials(name: string) {
  if (!name || name === 'Guest') return name.charAt(0).toUpperCase() || 'G';
  return name
    .split(' ')
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'U';
}

function AccountPage() {
  const queryClient = useQueryClient();
  const context = useRouteContext({ from: '/dashboard' });
  const user = createMemo(() => context()?.session?.user);
  const [name, setName] = createSignal(user()?.name || '');
  // Placeholder for avatar upload state
  // const [avatar, setAvatar] = createSignal(user()?.image || '');

  type UserUpdateVariables = { name: string; image: string | null | undefined };
  type MutationContext = { previousSession?: unknown };

  const updateUserMutation = useMutation<unknown, Error, UserUpdateVariables, MutationContext>(() => ({
    mutationFn: (updatedUser) => authClient.updateUser(updatedUser),
    onMutate: async (updatedUser) => {
      await queryClient.cancelQueries({ queryKey: ['session'] });
      const previousSession = queryClient.getQueryData(['session']);
      queryClient.setQueryData(['session'], (old: any) => ({
        ...old,
        user: { ...old.user, name: updatedUser.name },
      }));
      return { previousSession };
    },
    onError: (err, updatedUser, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(['session'], context.previousSession);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  }));

  const handleSave = (e: Event) => {
    e.preventDefault();
    if (name() === user()?.name) return;
    updateUserMutation.mutate({
      name: name(),
      image: user()?.image,
    });
  };

  return (
    <div class="container py-8 px-4 mx-auto max-w-xl flex flex-col min-h-screen">
      <h1 class="text-2xl font-semibold mb-6">Account</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your account information</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent class="flex flex-col items-center gap-6 pt-6">
          <div class="flex flex-col items-center gap-2">
            <Avatar class="h-20 w-20">
              {user()?.image ? (
                <AvatarImage src={user()?.image || undefined} alt={user()?.name || undefined} />
              ) : (
                <AvatarFallback class="text-2xl">{getInitials(user()?.name || '')}</AvatarFallback>
              )}
            </Avatar>
            <Button variant="outline" size="sm" disabled class="mt-2 opacity-60 cursor-not-allowed">
              Change Avatar (coming soon)
            </Button>
          </div>
          <form class="w-full flex flex-col gap-4 mt-4" onSubmit={handleSave} autocomplete="off">
            <div class="flex flex-col gap-2">
              <Label for="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={name()}
                onChange={setName}
                placeholder="Your name"
              />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                name="email"
                value={user()?.email || ''}
                disabled
                placeholder="Your email"
              />
            </div>
            <Button type="submit" variant="sf-compute" class="mt-2 w-full" onClick={handleSave} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Show when={updateUserMutation.isError}>
              <p class="text-sm text-destructive mt-2 text-center">
                Failed to update: {updateUserMutation.error?.message}
              </p>
            </Show>
          </form>
        </CardContent>
        <CardFooter class="flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
          <span>
            Account created&nbsp;
            <span class="font-medium text-foreground">
              {user()?.createdAt
                ? new Date(user().createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </span>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/dashboard/account')({
  component: AccountPage,
}); 