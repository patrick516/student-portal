import { useEffect, useState } from "react";
import { useApp } from "@/app/state/useApp";
import { api } from "@/api/client";
import { Input } from "@/components/ui/input";

type FormClass = {
  id: string;
  name: string;
  stream?: string | null;
  year?: number | null;
};

export default function Topbar() {
  const { user, classes, selectedClassId, setSelectedClassId } = useApp();
  const [formClasses, setFormClasses] = useState<FormClass[]>([]);

  useEffect(() => {
    const loadFormClasses = async () => {
      if (!user) return;
      if (!(user.role === "teacher" || user.role === "admin")) {
        setFormClasses([]);
        return;
      }
      try {
        const { data } = await api.get("/api/classes/my-form");
        setFormClasses(data.data || []);
      } catch {
        setFormClasses([]);
      }
    };
    loadFormClasses();
  }, [user]);

  return (
    <header className="sticky top-0 z-20 border-b border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/60 backdrop-blur">
      <div className="flex items-center justify-between h-16 max-w-6xl gap-4 px-4 mx-auto lg:px-6">
        {/* Left: search + class selector */}
        <div className="flex items-center flex-1 gap-3">
          <div className="relative w-full max-w-xs">
            <Input
              placeholder="Search…"
              className="h-9 w-full rounded-full border border-[hsl(var(--border))] bg-white/90 pl-9 pr-3 text-sm shadow-sm"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))]">
              🔍
            </span>
          </div>

          <div className="hidden sm:block">
            <select
              value={selectedClassId || ""}
              onChange={(e) => setSelectedClassId(e.target.value || null)}
              className="h-9 rounded-full border border-[hsl(var(--border))] bg-white/90 px-3 text-sm shadow-sm outline-none"
            >
              {classes.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                  {k.stream ? ` ${k.stream}` : ""}
                  {k.year ? ` • ${k.year}` : ""}
                </option>
              ))}
              {!classes.length && <option value="">No classes</option>}
            </select>
          </div>
        </div>

        {/* Right: user summary */}
        <div className="flex items-center gap-3">
          <div className="hidden leading-tight text-right sm:block">
            <div className="flex items-center justify-end gap-2 text-sm font-medium">
              <span className="max-w-[180px] truncate">
                {user?.name || "User"}
              </span>
              {formClasses.length > 0 && (
                <span className="inline-flex max-w-[220px] items-center truncate rounded-full border border-[hsl(var(--ring))]/50 bg-[hsl(var(--ring))]/10 px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--foreground))]">
                  Form Teacher •{" "}
                  {formClasses
                    .map((c) => `${c.name}${c.stream ? " " + c.stream : ""}`)
                    .join(", ")}
                </span>
              )}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              {user?.role || "role"}
            </div>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--ring))]/60 bg-white text-xs font-semibold shadow-sm">
            {user?.name ? user.name[0]?.toUpperCase() : "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
