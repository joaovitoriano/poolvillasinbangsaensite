"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    };

    const canRegister = process.env.NODE_ENV === "production" && "serviceWorker" in navigator;
    if (canRegister) {
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
