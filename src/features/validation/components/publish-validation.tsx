"use client";

import { FormEvent, useId, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/auth-client";

import styles from "./publish-validation.module.css";

type Step = "loading" | "sign-in" | "email-sent" | "confirm" | "publishing";

interface PublishValidationProps {
  className: string;
  sharePath?: string;
  visibility: "unlisted" | "public";
  onPublished: () => void;
}

export function PublishValidation({
  className,
  sharePath,
  visibility,
  onPublished,
}: PublishValidationProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailId = useId();
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function openDialog() {
    if (!sharePath || visibility === "public") return;
    setError("");
    setStep("loading");
    dialogRef.current?.showModal();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured.");
      setStep("sign-in");
      return;
    }

    const { data } = await supabase.auth.getUser();
    setStep(data.user ? "confirm" : "sign-in");
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !sharePath) return;

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", sharePath);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback.toString() },
    });

    if (signInError) {
      setError("We could not send the sign-in link. Try again.");
      return;
    }

    setStep("email-sent");
  }

  async function publish() {
    if (!sharePath) return;
    setError("");
    setStep("publishing");

    const response = await fetch(`/api/validations/${sharePath.slice(3)}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      setError(
        response.status === 401
          ? "Your sign-in expired. Close this dialog and try again."
          : "The validation could not be published. Try again.",
      );
      setStep(response.status === 401 ? "sign-in" : "confirm");
      return;
    }

    onPublished();
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        className={className}
        type="button"
        disabled={!sharePath || visibility === "public"}
        onClick={openDialog}
        title={!sharePath ? "Persistence is required before publishing" : undefined}
      >
        {visibility === "public" ? "Published publicly" : "Publish"}
      </button>
      <dialog className={styles.dialog} ref={dialogRef} aria-label="Publish validation">
        <button
          className={styles.close}
          type="button"
          aria-label="Close publish dialog"
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>

        {step === "loading" ? (
          <p className={styles.status}>Checking sign-in…</p>
        ) : null}

        {step === "sign-in" ? (
          <form className={styles.content} onSubmit={sendMagicLink}>
            <span className={styles.eyebrow}>Sign in to publish</span>
            <h2>Keep public reports accountable.</h2>
            <p>
              Enter your email and we’ll send a password-free sign-in link. The
              report remains unlisted until you return and confirm publishing.
            </p>
            <label className={styles.label} htmlFor={emailId}>
              Email address
            </label>
            <input
              className={styles.input}
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className={styles.primary} type="submit">
              Send sign-in link
            </button>
          </form>
        ) : null}

        {step === "email-sent" ? (
          <div className={styles.content}>
            <span className={styles.eyebrow}>Check your inbox</span>
            <h2>Your sign-in link is on its way.</h2>
            <p>
              Open the link on this device, return to the report, and select
              Publish again to make the report public.
            </p>
          </div>
        ) : null}

        {step === "confirm" || step === "publishing" ? (
          <div className={styles.content}>
            <span className={styles.eyebrow}>Final confirmation</span>
            <h2>Publish this report publicly?</h2>
            <p>
              Anyone with the URL can already view this unlisted report. Publishing
              also makes it eligible for the future Hall of Validation and associates
              it with your account.
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => dialogRef.current?.close()}
              >
                Keep unlisted
              </button>
              <button
                className={styles.primary}
                type="button"
                disabled={step === "publishing"}
                onClick={publish}
              >
                {step === "publishing" ? "Publishing…" : "Publish publicly"}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
