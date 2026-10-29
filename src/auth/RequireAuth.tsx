import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.bypass) return children;
  if (auth.isLoading) {
    return (
      <div className="grid min-h-svh place-items-center bg-white text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
        Checking your session…
      </div>
    );
  }
  if (!auth.isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return children;
}
