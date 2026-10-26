"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

const LoginForm = () => {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, { error: null });

  return (
    <form className="admin-login-form" action={action}>
      <label htmlFor="admin-email">Email</label>
      <input id="admin-email" name="email" type="email" required autoComplete="username" defaultValue={state.email} key={state.email} />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" name="password" type="password" required autoComplete="current-password" />
      {state.error && (
        <p className="admin-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="page-btn page-btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
};

export default LoginForm;
