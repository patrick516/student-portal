// src/app/features/dashboard/DashboardWelcomeHeader.tsx
import { Sparkles } from "lucide-react";
import type { AppUser } from "@/app/state/context";

interface DashboardWelcomeHeaderProps {
  user: AppUser | null;
}

export function DashboardWelcomeHeader({ user }: DashboardWelcomeHeaderProps) {
  return (
    <div className="relative flex items-center justify-between px-4 py-3 shadow-sm rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
          <Sparkles size={18} className="text-white" />
        </div>

        <div className="flex flex-col">
          <h1 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white md:text-base">
            Welcome back, {user?.name || "Admin"}! 👋
            {user?.email && (
              <span className="font-medium text-blue-100 text-md md:text-md">
                {user.email}
              </span>
            )}
          </h1>
        </div>
      </div>

      <div className="absolute right-6 top-6 opacity-20">
        <div className="w-24 h-24 rounded-full bg-white/10"></div>
      </div>
      <div className="absolute w-32 h-32 rounded-full -bottom-4 -right-4 bg-white/5"></div>
    </div>
  );
}
