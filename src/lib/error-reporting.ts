export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[Akira ERP] Unhandled error", error, {
    route: window.location.pathname,
    ...context,
  });
}
