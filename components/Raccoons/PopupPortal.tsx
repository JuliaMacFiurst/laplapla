import { createPortal } from "react-dom";
import { ReactNode, useEffect, useState } from "react";

export default function PopupPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (typeof window === "undefined") return null;

  const el = document.getElementById("popup-root");
  return mounted && el ? createPortal(children, el) : null;
}