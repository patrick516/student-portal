import { useContext } from "react";
import { AppContext, type Ctx } from "./context";

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
