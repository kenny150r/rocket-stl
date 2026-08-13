import { useState, type FormEvent } from 'react';
import { supabase } from './supabase';

type Props = {
  configured: boolean;
  message?: string;
  onSignOut?: () => void;
};

export function LoginPage({ configured, message, onSignOut }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(message ?? null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (err) setError(err.message);
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <p className="eyebrow">Rocket STL</p>
        <h1>Sign in</h1>
        <p className="muted">
          Access is limited to allowlisted accounts on this Supabase project.
        </p>
        {!configured ? (
          <p className="error">{message}</p>
        ) : onSignOut ? (
          <>
            <p className="error">{error}</p>
            <button type="button" className="btn primary" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
