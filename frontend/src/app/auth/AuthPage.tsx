// frontend/src/app/auth/AuthPage.tsx
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    mustChangePassword?: boolean;
  };
};

type ApiErrorShape = {
  response?: { data?: { error?: string } };
  message?: string;
};

type CanRegisterResponse = {
  allowed: boolean;
};

export default function AuthPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex items-center justify-center p-12 bg-[hsl(var(--muted))]">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <img
              src="/school.png"
              alt="School"
              className="w-10 h-10 rounded-lg shadow"
            />
            <h1 className="text-2xl font-bold tracking-tight">
              Student Portal
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed">
            Manage students, classes, attendance, fees and exams with a modern,
            role-based school management system.
          </p>
          <ul className="text-sm text-[hsl(var(--muted-foreground))] list-disc ml-5 space-y-1.5">
            <li>Head Teacher: manage users, classes and results</li>
            <li>Teachers: manage subjects, attendance and marks</li>
            <li>Bursar: manage fees, invoices and debtors</li>
          </ul>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-none shadow-lg rounded-2xl bg-white/95">
          <CardHeader>
            <div className="flex items-center gap-3">
              <img
                src="/school.png"
                alt="School"
                className="w-8 h-8 rounded-lg"
              />
              <div>
                <CardTitle className="text-xl">Sign in</CardTitle>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Use your school account to access the portal.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoginForm() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/api/auth/login", {
        email,
        password,
      });
      const data = res.data;

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role !== "admin" && data.user.mustChangePassword) {
        nav("/auth/change-password", { replace: true });
      } else {
        nav("/app", { replace: true });
      }
    } catch (err: unknown) {
      const error = err as ApiErrorShape;
      const msg =
        error.response?.data?.error ||
        (error.message && error.message.includes("Network")
          ? "Cannot reach server"
          : "Login failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const goRegisterHeadteacher = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<CanRegisterResponse>(
        "/api/auth/can-register-first"
      );
      if (res.data?.allowed) {
        nav("/auth/register-headteacher");
      } else {
        setError(
          "Headteacher already registered. Please ask them to create your account."
        );
      }
    } catch (err: unknown) {
      const error = err as ApiErrorShape;
      const msg =
        error.response?.data?.error ||
        (error.message && error.message.includes("Network")
          ? "Cannot reach server"
          : "Could not check registration status.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="head@school.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="rounded-md border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/5 px-3 py-2 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Signing in..." : "Sign in"}
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={goRegisterHeadteacher}
      >
        I am the Head Teacher (register first account)
      </Button>
    </form>
  );
}
