import { createFileRoute, useNavigate } from '@tanstack/solid-router';
import { Show, createSignal } from 'solid-js';
import { useQuery, useQueryClient, type QueryObserverResult } from '@tanstack/solid-query';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { authClient } from '~/lib/auth-client';
import { sessionQueryOptions } from '~/lib/auth-guard';
import { useSignOut } from '~/lib/auth-actions';
import type { User, Session } from 'better-auth';

type SessionQueryResult = {
    user: User,
    session: Session
} | null;

function AuthPage() {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(() => sessionQueryOptions()) as QueryObserverResult<SessionQueryResult, Error>;
  const navigate = useNavigate();
  const signOut = useSignOut();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');

  const handleSignIn = async () => {
    if (!email() || !password()) return;
    const { data, error } = await authClient.signIn.email({
      email: email(),
      password: password(),
    });
    if (data) {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate({ to: '/dashboard' });
    }
    if (error) alert(error.message);
  };

  const handleSignUp = async () => {
    if (!email() || !password()) return;
    const { data, error } = await authClient.signUp.email({
        email: email(),
        password: password(),
        name: email().split('@')[0],
    });
    if (data) {
        await queryClient.invalidateQueries({ queryKey: ['session'] });
        navigate({ to: '/dashboard' });
    }
    if (error) alert(error.message);
  };

  return (
    <div class="p-8 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 via-stone-100 to-stone-400/60 text-gray-900">
      <Card class="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <Show when={sessionQuery.isPending}>
            <p>Loading session...</p>
          </Show>
          <Show when={!sessionQuery.isPending && sessionQuery.data}>
            <div class="space-y-4">
              <p>Welcome, {sessionQuery.data?.user.email}!</p>
              <Button onClick={signOut} class="w-full">Sign Out</Button>
            </div>
          </Show>
          <Show when={!sessionQuery.isPending && !sessionQuery.data}>
            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email()}
                  onChange={setEmail}
                />
              </div>
              <div class="space-y-2">
                <Label for="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password()}
                  onChange={setPassword}
                />
              </div>
              <div class="flex space-x-2 pt-2">
                <Button onClick={handleSignIn} class="w-full">Sign In</Button>
                <Button onClick={handleSignUp} variant="outline" class="w-full">Sign Up</Button>
              </div>
            </div>
          </Show>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/auth')({
  component: AuthPage,
}); 