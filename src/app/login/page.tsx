"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const archived = searchParams.get("archived") === "1";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient({ rememberMe });
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", data.user.id).single();

    const next = searchParams.get("next");
    let destination = "/client";
    if (profile?.role === "admin") destination = "/admin";
    else if (profile?.role === "employee") destination = "/employee";

    if (next && next !== "/login") destination = next;

    router.push(destination);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent-soft/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 8L14 4L23 8V16L14 24L5 16V8Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M14 4V24M5 8L14 16L23 8" stroke="#b8860b" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-primary">VOXPACT</h1>
          <p className="mt-1.5 text-sm text-muted">Auto insurance live transfer portal</p>
        </div>

        <Card className="p-7 shadow-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <Label>Email address</Label>
              <Input type="email" required autoComplete="username"
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
              />
              Keep me signed in on this browser
            </label>
            {archived && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5">
                <p className="text-sm text-warning">This account has been archived. Contact your admin if this is unexpected.</p>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-danger" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5zm-.75 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
                </svg>
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
            <Button type="submit" disabled={loading} className="mt-1 w-full py-3">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                      strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="mt-5 text-center text-xs text-muted">
          Forgot your password?{" "}
          <span className="font-medium text-foreground">Contact your account admin.</span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
