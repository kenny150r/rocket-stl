import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isAllowlisted, isSupabaseConfigured, supabase } from './supabase';
import { LoginPage } from './LoginPage';

export function AuthGate({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!configured);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setAllowed(null);
      setGateError(null);
      return;
    }
    let cancelled = false;
    setAllowed(null);
    isAllowlisted(session.user.email)
      .then((ok) => {
        if (cancelled) return;
        setAllowed(ok);
        if (!ok) {
          setGateError('This account is not on the allowlist for Rocket STL.');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAllowed(false);
        setGateError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!configured) {
    if (import.meta.env.DEV) return <>{children}</>;
    return (
      <LoginPage
        message="This build is missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY."
        configured={false}
      />
    );
  }

  if (!ready) return <div className="boot">Loading…</div>;
  if (!session) return <LoginPage configured />;
  if (allowed === null) return <div className="boot">Checking access…</div>;
  if (!allowed) {
    return (
      <LoginPage
        configured
        message={gateError ?? 'Not authorized.'}
        onSignOut={() => supabase?.auth.signOut()}
      />
    );
  }
  return <>{children}</>;
}
