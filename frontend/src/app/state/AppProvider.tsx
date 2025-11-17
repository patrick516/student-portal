import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { AppContext, type AppUser, type Klass } from "./context";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const user: AppUser | null = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const refreshClasses = async () => {
    const { data } = await api.get("/api/classes");
    setClasses(data.data || []);
  };

  useEffect(() => {
    refreshClasses();
  }, []);
  useEffect(() => {
    if (classes.length && !selectedClassId) setSelectedClassId(classes[0].id);
  }, [classes, selectedClassId]);

  return (
    <AppContext.Provider
      value={{
        user,
        classes,
        selectedClassId,
        setSelectedClassId,
        refreshClasses,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
