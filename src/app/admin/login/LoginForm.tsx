"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError("");
    const { error: authError } = await browserClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/admin/auth/callback` },
    });
    // Sign-ups are limited to the owner email by a database trigger; don't reveal which emails exist.
    if (authError && authError.status === 429) {
      setError("Too many sign-in emails. Wait a few minutes and try again.");
      setState("idle");
      return;
    }
    setState("sent");
  };

  if (state === "sent") {
    return (
      <p className="admin-note" role="status">
        If that email is allowed, a sign-in link is on its way. Check your inbox.
      </p>
    );
  }

  return (
    <form className="admin-login-form" onSubmit={onSubmit}>
      <label htmlFor="admin-email">Email</label>
      <input
        id="admin-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="page-btn page-btn-primary" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
};

export default LoginForm;
