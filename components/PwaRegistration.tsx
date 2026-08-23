"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const previousViewport = viewport?.content;
    const preventGesture = (event: Event) => event.preventDefault();

    if (isStandalone && viewport) {
      viewport.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
      document.addEventListener("gesturestart", preventGesture, { passive: false });
      document.addEventListener("gesturechange", preventGesture, { passive: false });
    }

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
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      if (isStandalone && viewport && previousViewport !== undefined) viewport.content = previousViewport;
    };
  }, []);

  return null;
}
