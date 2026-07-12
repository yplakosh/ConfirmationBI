"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/auth-client";

import styles from "./account-indicator.module.css";

export function AccountIndicator() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const emailId = useId();
  const [email, setEmail] = useState<string | null>(null);
  const [resolved, setResolved] = useState(
    () =>
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const [loginEmail, setLoginEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email ?? null);
      setResolved(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user.email ?? null);
      setResolved(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setBusy(false);

    if (error) {
      setMessage("Sign out failed. Try again.");
      return;
    }

    setEmail(null);
    setMessage("");
    detailsRef.current?.removeAttribute("open");
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Login is not configured.");
      return;
    }

    setBusy(true);
    setMessage("");
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", window.location.pathname);
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: { emailRedirectTo: callback.toString() },
    });
    setBusy(false);
    setMessage(
      error
        ? "We could not send the sign-in link. Try again."
        : "Check your inbox for the sign-in link.",
    );
  }

  if (!resolved) return null;

  return (
    <details className={styles.account} ref={detailsRef}>
      <summary
        className={email ? styles.avatarTrigger : styles.loginTrigger}
        aria-label={email ? `Account menu for ${email}` : "Log in"}
      >
        {email ? (
          <span className={styles.avatar} aria-hidden="true">
            {email.charAt(0).toUpperCase()}
          </span>
        ) : (
          "Log in"
        )}
      </summary>
      <div className={styles.menu}>
        {email ? (
          <>
            <span className={styles.menuLabel}>Signed in as</span>
            <strong className={styles.email}>{email}</strong>
            <button
              className={styles.menuAction}
              type="button"
              disabled={busy}
              onClick={signOut}
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <form className={styles.loginForm} onSubmit={sendMagicLink}>
            <span className={styles.menuLabel}>Password-free login</span>
            <label className={styles.emailLabel} htmlFor={emailId}>
              Email address
            </label>
            <input
              className={styles.input}
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
            />
            <button className={styles.submit} type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send login link"}
            </button>
          </form>
        )}
        {message ? (
          <span className={styles.message} role="status">
            {message}
          </span>
        ) : null}
      </div>
    </details>
  );
}
