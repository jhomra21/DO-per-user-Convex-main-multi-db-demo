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

  const handleGoogleSignIn = () => {
    authClient.signIn.social({
      provider: 'google',
    });
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
              <div class="relative py-2">
                <div class="absolute inset-0 flex items-center">
                  <span class="w-full border-t" />
                </div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button variant="outline" class="w-full" onClick={handleGoogleSignIn}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="mr-2 h-4 w-4">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.641-3.219-11.303-7.583l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,36.407,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                Sign In with Google
              </Button>
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