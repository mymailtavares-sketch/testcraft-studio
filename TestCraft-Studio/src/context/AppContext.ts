import { createContext, useContext } from "react";
import type { useAppController } from "../services/useAppController";

type Controller = ReturnType<typeof useAppController>;
export const AppContext = createContext<Controller | null>(null);
export function useAppContext(): Controller {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppContext indisponível");
  return value;
}
