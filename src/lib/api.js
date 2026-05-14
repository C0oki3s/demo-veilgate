function computeDefaultApiBase() {
  const host = window.location.hostname;
  const scheme = window.location.protocol;

  if (host.endsWith("demo.veilgate.dev")) {
    return "https://demo-api.veilgate.dev";
  }

  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost";
  }

  return `${scheme}//${host}`;
}

export const API_BASE = import.meta.env.VITE_API_BASE_URL || computeDefaultApiBase();

async function request(path, init = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function connectLive(onEvent, onError) {
  const eventSource = new EventSource(`${API_BASE}/api/live`);
  eventSource.onmessage = (event) => {
    try {
      onEvent(JSON.parse(event.data));
    } catch {
      // ignore malformed event payloads
    }
  };
  eventSource.onerror = () => {
    if (onError) onError("Live stream disconnected. Trying to reconnect...");
  };
  return eventSource;
}

export const api = {
  products: (q = "") => request(`/api/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  stats: () => request("/api/stats"),
  probe: (profile) =>
    request("/api/lab/probe", {
      method: "POST",
      body: JSON.stringify({ profile }),
    }),
  veilgateLogs: (source = "") =>
    request(`/api/veilgate/logs${source ? `?source=${encodeURIComponent(source)}` : ""}`),
  veilgateConfig: () => request("/api/veilgate/config"),
};
