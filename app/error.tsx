"use client";
import { useEffect } from "react";
export default function AppError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "CLIENT_RENDER",
        route: location.pathname.split("?")[0],
      }),
    }).catch(() => {});
  }, []);
  return (
    <main className="onboarding-content">
      <h1>Something went wrong.</h1>
      <p>Your saved project is still there. Try opening this page again.</p>
      <button className="button primary" onClick={() => retry()}>
        Try again
      </button>
      <a href="/">Back to homepage</a>
    </main>
  );
}
