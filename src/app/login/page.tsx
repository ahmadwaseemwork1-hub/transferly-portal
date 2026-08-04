"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label } from "@/components/ui";

// Supabase's own auth error messages are safe to show as-is — they never
// leak passwords or internal details, and seeing the real reason (rate
// limited, email not confirmed, etc.) beats a generic message that hides
// what's actually wrong.
function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  return message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "not_authorized") {
      setError(
        "That account isn't set up for this area of the portal. Contact your admin."
      );
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(friendlyAuthError(signInError.message));
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Sign-in did not return a user. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      setError(
        `Signed in, but couldn't load your account details (${profileError.message}). ` +
          `This usually means the database isn't connected correctly — check your ` +
          `Supabase environment variables in Vercel.`
      );
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    if (!profile) {
      setError(
        "Your login works, but no account record exists for it yet. " +
          "Ask your admin to re-create your account, or if you are the admin, " +
          "re-run the create-admin script from SETUP.md."
      );
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    const next = searchParams.get("next");
    const roleHome =
      profile.role === "admin" ? "/admin" : profile.role === "employee" ? "/employee" : "/client";
    const destination = next && next !== "/login" ? next : roleHome;

    router.push(destination);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-semibold text-primary">Transferly</h1>
          <p className="mt-1 text-sm text-muted">Live transfer management portal</p>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="mt-1 w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-xs text-muted">
          Forgot your password? Contact your account admin.
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
