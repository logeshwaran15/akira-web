export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7237";

function handleUnauthorized() {
  localStorage.removeItem("akira_token");
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export async function apiFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem("akira_token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (res.status === 401 && token) {
    // Only an expired/invalid *session* should force a redirect. A 401 with no
    // token attached is just a failed login attempt (wrong credentials) and
    // must bubble up as a normal error for the login form to display.
    handleUnauthorized();
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = body;
    try {
      message = JSON.parse(body)?.message ?? body;
    } catch {
      // body wasn't JSON, use as-is
    }
    throw new Error(message || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiUpload(path: string, formData: FormData) {
  const token = localStorage.getItem("akira_token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (res.status === 401 && token) {
    handleUnauthorized();
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = body;
    try {
      message = JSON.parse(body)?.message ?? body;
    } catch {
      // body wasn't JSON, use as-is
    }
    throw new Error(message || `Upload failed with status ${res.status}`);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
