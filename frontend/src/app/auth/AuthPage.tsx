// frontend/src/app/auth/AuthPage.tsx
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

// Branding (frontend env – add VITE_BRAND_* in frontend .env later)
const BRAND_SCHOOL =
  import.meta.env.VITE_BRAND_SCHOOL || "Patrick Kulinji School";
const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || "STUDENT PORTAL";

export default function AuthPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Diagonal blue background shape */}
      <div
        className="absolute inset-0 bg-[#02B5F7]"
        style={{
          clipPath: "polygon(0 0, 45% 0, 35% 100%, 0 100%)",
        }}
      />

      {/* Main white panel */}
      <div className="relative z-10 flex flex-col w-full max-w-5xl overflow-hidden bg-white shadow-2xl rounded-3xl md:flex-row">
        {/* Left: logo + text */}
        <div className="flex items-center justify-center w-full px-8 py-12 md:w-1/2 md:py-16 bg-gradient-to-br from-white to-gray-50">
          <div className="flex flex-col items-start gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-20 h-20 bg-black rounded-lg shadow-lg">
                <img
                  src="/school.png"
                  alt="School Logo"
                  className="object-contain w-12 h-12"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                  {BRAND_NAME}
                </p>
                <h1 className="text-xl font-bold leading-tight text-gray-800 md:text-2xl">
                  {BRAND_SCHOOL}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Right: login form */}
        <div className="flex items-center justify-center w-full px-8 py-12 bg-white md:w-1/2 md:py-16">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
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

  // Same logic as old "register headteacher", but now phrased as "Login as Admin"
  const handleRegisterAdmin = async () => {
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
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Input
            id="email"
            type="email"
            placeholder="Enter your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="h-12 rounded-xl border-2 border-[#02B5F7] focus-visible:ring-[#02B5F7] focus-visible:ring-2 focus-visible:border-[#02B5F7] placeholder:text-gray-400 text-gray-700"
          />
        </div>

        <div className="space-y-2">
          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="h-12 rounded-xl border-2 border-[#02B5F7] focus-visible:ring-[#02B5F7] focus-visible:ring-2 focus-visible:border-[#02B5F7] placeholder:text-gray-400 text-gray-700"
          />
        </div>

        {error && (
          <div className="px-4 py-3 text-sm text-red-700 border border-red-300 rounded-xl bg-red-50">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[#02B5F7] hover:bg-[#029cd4] text-white font-medium text-base shadow-md hover:shadow-lg transition-all duration-200"
        >
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>

      {/* Link-style button below, now "Login as Admin ?" */}
      <button
        type="button"
        disabled={loading}
        onClick={handleRegisterAdmin}
        className="block w-full text-center text-sm font-medium text-[#02B5F7] hover:text-[#029cd4] hover:underline disabled:opacity-60 transition-colors duration-200"
      >
        Register as Admin ?
      </button>
    </div>
  );
}
