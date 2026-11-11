"use client";
import { useEffect } from "react";
import { safeRoute } from "@/lib/event-shape";
export default function ErrorMonitor() {
  useEffect(() => {
    const original = window.fetch.bind(window);
    let sent = 0;
    function report(code: string, route = location.pathname, status?: number) {
      if (sent++ >= 10) return;
      void original("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, route: safeRoute(route), status }),
        keepalive: true,
      }).catch(() => {});
    }
    const error = () => report("CLIENT_EXCEPTION"),
      rejection = () => report("CLIENT_REJECTION");
    window.addEventListener("error", error);
    window.addEventListener("unhandledrejection", rejection);
    const wrapped: typeof fetch = async (input, init) => {
      let path = "";
      try {
        const url = new URL(
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url,
          location.origin,
        );
        if (url.origin === location.origin) path = url.pathname;
      } catch {}
      const observe =
        path.startsWith("/api/") &&
        !path.startsWith("/api/events") &&
        !path.startsWith("/api/admin") &&
        !path.startsWith("/api/auth");
      try {
        const response = await original(input, init);
        if (
          observe &&
          response.status >= 400 &&
          ![401, 403].includes(response.status)
        )
          report("HTTP_ERROR", path, response.status);
        return response;
      } catch (e) {
        if (observe) report("NETWORK_ERROR", path);
        throw e;
      }
    };
    window.fetch = wrapped;
    return () => {
      if (window.fetch === wrapped) window.fetch = original;
      window.removeEventListener("error", error);
      window.removeEventListener("unhandledrejection", rejection);
    };
  }, []);
  return null;
}
