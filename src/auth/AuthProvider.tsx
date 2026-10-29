import { LogtoProvider, useLogto } from '@logto/react';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { isAuthBypass, logtoConfig, logtoResource } from './config';

export type AuthValue = {
  bypass: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  getAccessToken: () => Promise<string | undefined>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const bypassValue: AuthValue = {
  bypass: true,
  isAuthenticated: true,
  isLoading: false,
  getAccessToken: () => Promise.resolve(undefined),
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isAuthBypass()) {
    return <AuthContext.Provider value={bypassValue}>{children}</AuthContext.Provider>;
  }
  return (
    <LogtoProvider config={logtoConfig()}>
      <LogtoBridge>{children}</LogtoBridge>
    </LogtoProvider>
  );
}

function LogtoBridge({ children }: { children: ReactNode }) {
  const logto = useLogto();
  const value = useMemo<AuthValue>(
    () => ({
      bypass: false,
      isAuthenticated: logto.isAuthenticated,
      isLoading: logto.isLoading,
      getAccessToken: async () => {
        const resource = logtoResource();
        if (!resource) return undefined;
        const token = await logto.getAccessToken(resource);
        return token ?? undefined;
      },
      signIn: () => logto.signIn(`${window.location.origin}/callback`),
      signOut: () => logto.signOut(`${window.location.origin}/`),
    }),
    [logto],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
