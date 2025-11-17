import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function HeadteacherRegisterPage() {
  const nav = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/auth/can-register-first");
        setAllowed(res.data?.allowed);
      } catch {
        setAllowed(false);
      }
    })();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/api/auth/register-headteacher", {
        firstName,
        lastName,
        email,
        phone,
        password,
      });
      const data = res.data as {
        token: string;
        user: {
          id: string;
          name: string;
          email: string;
          role: string;
          mustChangePassword?: boolean;
        };
      };
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      nav("/app", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Checking system status…
        </p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              Headteacher already registered
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-[hsl(var(--muted-foreground))]">
              A Headteacher account already exists. Please use the login page.
            </p>
            <Button
              className="w-full"
              onClick={() => nav("/auth", { replace: true })}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Headteacher Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-1.5">
              <Label>First Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-[hsl(var(--destructive))]">
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating Headteacher..." : "Register Headteacher"}
            </Button>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              This page only works when there are no users in the system.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
