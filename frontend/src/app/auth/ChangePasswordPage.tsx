import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ChangePasswordPage() {
  const nav = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      // update local flag
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        user.mustChangePassword = false;
        localStorage.setItem("user", JSON.stringify(user));
      }
      nav("/app", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex items-center justify-center p-12 bg-[hsl(var(--muted))]">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <img
              src="/school.png"
              alt="School"
              className="w-10 h-10 rounded-lg shadow"
            />
            <h1 className="text-2xl font-bold">Change Password</h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))]">
            This is your first login. Please set a new password to continue.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Set a new password</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div className="grid gap-1.5">
                <Label>Current (temporary) password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>New password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Confirm password</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-[hsl(var(--destructive))]">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : "Save"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
