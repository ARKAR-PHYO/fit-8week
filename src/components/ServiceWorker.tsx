"use client";

import { useEffect } from "react";

/** Registers /sw.js in production builds only, so development always loads fresh code. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  }, []);
  return null;
}
