import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-6">
        <div className="h-10 w-40 animate-pulse rounded-full bg-secondary" />
      </main>
    );
  }
  if (user) return <Navigate to="/" />;

  async function onProvider(providerId: string) {
    setError(null);
    setBusy(providerId);
    try {
      await signIn(providerId, { callbackURL: "/", errorCallbackURL: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(null);
    }
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      if (!authEnabled) throw new Error("Sign-in is disabled.");
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Desk",
        });
        if (err) throw new Error(err.message || "Could not create the account.");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message || "Could not sign in.");
      }
      try {
        await authClient.getSession();
      } catch {
        /* session store recovers on the next page */
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(null);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-end justify-center gap-0.5 rounded-lg bg-secondary pb-1.5">
            <span className="h-2 w-1 rounded-sm bg-foreground" />
            <span className="h-3.5 w-1 rounded-sm bg-foreground" />
            <span className="h-2.5 w-1 rounded-sm bg-accent" />
          </span>
          <span className="text-sm font-medium tracking-tight">Data Desk</span>
        </Link>

        <h1 className="mt-10 font-serif text-4xl font-medium tracking-tight">Sign in</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your names, WACC, and notes stay on this desk — Google, X, or email.
        </p>

        {authEnabled ? (
          <div className="mt-8 space-y-3">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant={p.idp === "google" ? "default" : "outline"}
                className="w-full"
                disabled={busy != null}
                onClick={() => void onProvider(p.providerId)}
              >
                {busy === p.providerId ? "Opening…" : `Continue with ${p.label}`}
              </Button>
            ))}

            <div className="flex items-center gap-3 py-2">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">or email</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={(e) => void onEmail(e)} className="space-y-3">
              {mode === "up" ? (
                <Field
                  id="desk-name"
                  label="Name"
                  autoComplete="name"
                  value={name}
                  onChange={setName}
                />
              ) : null}
              <Field
                id="desk-email"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
              />
              <Field
                id="desk-password"
                label="Password"
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={setPassword}
                minLength={8}
              />
              <Button type="submit" variant="accent" className="w-full" disabled={busy != null}>
                {busy === "email" ? "Working…" : mode === "up" ? "Create account" : "Sign in with email"}
              </Button>
            </form>

            <button
              type="button"
              className="w-full pt-1 text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMode((m) => (m === "in" ? "up" : "in"));
                setError(null);
              }}
            >
              {mode === "in" ? "Need an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">Sign-in is disabled.</p>
        )}

        {error ? <p className="mt-4 text-sm text-down">{error}</p> : null}

        <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
          The tape is public. Sign in only to keep your model. Educational, not advice.
        </p>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-lg bg-secondary px-3 text-sm text-foreground outline-none",
          "shadow-[var(--shadow-border)] focus-visible:ring-2 focus-visible:ring-ring",
        )}
      />
    </label>
  );
}
