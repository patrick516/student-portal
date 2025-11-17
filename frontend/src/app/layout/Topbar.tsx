// frontend/src/app/layout/Topbar.tsx
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
    <header className="flex items-center justify-between h-16 gap-3 px-4 bg-white border-b">
      <div className="flex items-center gap-2">
        {/* search */}
        <Input
          placeholder="Search…"
          className="h-9 w-56 rounded-md bg-[hsl(var(--input))] px-3 text-sm"
        />
        {/* class selector */}
        <select
          value={selectedClassId || ""}
          onChange={(e) => setSelectedClassId(e.target.value || null)}
          className="h-9 rounded-md bg-[hsl(var(--input))] px-3 text-sm outline-none border border-[hsl(var(--border))]"
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

      <div className="flex items-center gap-3">
        <div className="leading-tight text-right">
          <div className="flex items-center justify-end gap-2 text-sm font-medium">
            <span>{user?.name || "User"}</span>
            {/* Form teacher badge */}
            {formClasses.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--ring))]/15 text-[hsl(var(--foreground))] border border-[hsl(var(--ring))]/60">
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
        <div className="h-9 w-9 rounded-full bg-[hsl(var(--ring))] grid place-items-center text-xs font-semibold">
          {user?.name ? user.name[0]?.toUpperCase() : "U"}
        </div>
      </div>
    </header>
  );
}
