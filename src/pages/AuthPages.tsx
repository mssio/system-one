import { useHandleSignInCallback } from '@logto/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Button } from '../components/catalyst/button';
import { Heading } from '../components/catalyst/heading';
import { Text } from '../components/catalyst/text';
import { useAuth } from '../auth/AuthProvider';

export function SignInPage() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (auth.bypass) {
    return (
      <AuthCard title="Local session">
        <Text>
          Logto is not configured, or the API is in mock mode. The workspace is open without signing
          in.
        </Text>
        <Button href="/" color="indigo" className="mt-6">
          Continue
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Sign in">
      <Text>Sign in to send judgments to the System One backend.</Text>
      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        color="indigo"
        className="mt-6"
        onClick={() => {
          void auth.signIn().catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
          });
        }}
      >
        Continue to sign in
      </Button>
    </AuthCard>
  );
}

export function CallbackPage() {
  const auth = useAuth();
  if (auth.bypass) return <Navigate to="/" replace />;
  return <LogtoCallback />;
}

function LogtoCallback() {
  const navigate = useNavigate();
  const { isLoading, error } = useHandleSignInCallback(() => {
    void navigate('/', { replace: true });
  });

  return (
    <AuthCard title="Signing you in">
      <Text>{isLoading ? 'Finishing sign-in…' : 'Redirecting…'}</Text>
      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error.message}{' '}
          <Link to="/sign-in" className="underline">
            Try again
          </Link>
        </p>
      ) : null}
    </AuthCard>
  );
}

export function SignOutPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.bypass) {
      void navigate('/', { replace: true });
      return;
    }
    void auth.signOut();
  }, [auth, navigate]);

  return (
    <AuthCard title="Signing out">
      <Text>Ending your session…</Text>
    </AuthCard>
  );
}

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-svh place-items-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Jev
        </p>
        <Heading className="mt-2">{title}</Heading>
        <div className="mt-3">{children}</div>
      </section>
    </main>
  );
}
