"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/admin";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="broker-card mx-auto mt-10 max-w-sm space-y-3 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const res = await loginAction(fd);
          if (res.error) setError(res.error);
          else window.location.reload();
        });
      }}
    >
      <h1 className="text-lg font-bold">Admin access</h1>
      <input
        type="password"
        name="password"
        placeholder="Password"
        autoFocus
        className="field"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-40">
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
