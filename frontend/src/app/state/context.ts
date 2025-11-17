import { createContext } from "react";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "bursar" | "viewer";
};
export type Klass = {
  id: string;
  name: string;
  stream?: string | null;
  year?: number | null;
};

export type Ctx = {
  user: AppUser | null;
  classes: Klass[];
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
  refreshClasses: () => Promise<void>;
};

export const AppContext = createContext<Ctx | null>(null);
