import { createLazyFileRoute, useNavigate } from '@tanstack/solid-router'
import { createEffect } from 'solid-js'

export const Route = createLazyFileRoute('/api/auth/callback/google')({
  component: GoogleCallbackComponent,
})

function GoogleCallbackComponent() {
  const navigate = useNavigate()

  createEffect(() => {
    (async () => {
      try {
        // This component is rendered by the client-side router.
        // It immediately makes a fetch request to the same URL it's on.
        // This fetch IS handled by the worker, which processes the code,
        // sets the session cookie, and returns a success response.
        const response = await fetch(window.location.href, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          // The cookie is set. Now we can navigate to the dashboard.
          navigate({ to: '/dashboard', replace: true });
        } else {
          const error = await response.json();
          console.error('Authentication failed:', error);
          // On failure, redirect to the home page for now.
          navigate({ to: '/', replace: true });
        }
      } catch (e) {
        console.error('An error occurred during authentication:', e);
        // On failure, redirect to the home page for now.
        navigate({ to: '/', replace: true });
      }
    })();
  });

  return <div>Please wait while we complete your sign-in...</div>;
} 