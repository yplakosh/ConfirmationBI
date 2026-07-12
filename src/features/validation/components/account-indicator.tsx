"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/auth-client";

import styles from "./account-indicator.module.css";

export function AccountIndicator() {
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setEmail(session?.user.email ?? null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!email) return null;

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setSigningOut(false);
      return;
    }

    setEmail(null);
  }

  return (
    <div className={styles.account} aria-label={`Signed in as ${email}`} title={email}>
      <span className={styles.avatar} aria-hidden="true">
        {email.charAt(0).toUpperCase()}
      </span>
      <span className={styles.identity}>
        <span className={styles.prefix}>Signed in as</span>
        <span className={styles.email}>{email}</span>
      </span>
      <button
        className={styles.signOut}
        type="button"
        disabled={signingOut}
        onClick={signOut}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
