import { getToken, clearAuth } from "./auth";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8081" : window.location.origin);

async function request(path, init = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (response.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  signup: (data) =>
    request("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/api/auth/me"),

  // Products
  products: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
    ).toString();
    return request(`/api/products${q ? `?${q}` : ""}`);
  },
  featuredProducts: () => request("/api/products/featured"),
  product: (id) => request(`/api/products/${id}`),

  // Cart
  cart: () => request("/api/cart"),
  addToCart: (productId, quantity = 1) =>
    request("/api/cart/items", {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    }),
  updateCartItem: (productId, quantity) =>
    request(`/api/cart/items/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    }),
  removeCartItem: (productId) =>
    request(`/api/cart/items/${productId}`, { method: "DELETE" }),
  clearCart: () => request("/api/cart", { method: "DELETE" }),

  // Orders
  orders: () => request("/api/orders"),
  order: (id) => request(`/api/orders/${id}`),
  createOrder: (data) =>
    request("/api/orders", { method: "POST", body: JSON.stringify(data) }),
  cancelOrder: (id) => request(`/api/orders/${id}/cancel`, { method: "PUT" }),

  // Returns
  returns: () => request("/api/returns"),
  return_: (id) => request(`/api/returns/${id}`),
  createReturn: (data) =>
    request("/api/returns", { method: "POST", body: JSON.stringify(data) }),

  // Support
  tickets: () => request("/api/support"),
  ticket: (id) => request(`/api/support/${id}`),
  createTicket: (data) =>
    request("/api/support", { method: "POST", body: JSON.stringify(data) }),
  replyTicket: (id, body) =>
    request(`/api/support/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  closeTicket: (id) => request(`/api/support/${id}/close`, { method: "PUT" }),

  // Profile
  profile: () => request("/api/users/me"),
  updateProfile: (data) =>
    request("/api/users/me", { method: "PUT", body: JSON.stringify(data) }),
  changePassword: (data) =>
    request("/api/users/me/password", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Admin
  simulationState: () => request("/api/admin/simulation"),
  startSimulation: (userCount) =>
    request("/api/admin/simulation/start", {
      method: "POST",
      body: JSON.stringify({ userCount }),
    }),
  stopSimulation: (data = {}) =>
    request("/api/admin/simulation/stop", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}
