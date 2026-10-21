import { createContext, useContext } from "react";
import type { OriginMode } from "./originMode";

export const OriginModeContext = createContext<OriginMode>("UNKNOWN");
export const useOriginMode = () => useContext(OriginModeContext);
