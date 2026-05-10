const BASE = import.meta.env.VITE_BACKEND_URL || "";
// In dev, vite proxies /api → backend. In prod, same-origin.

async function request<T>(
  path: string,
  init: RequestInit & { adminToken?: string } = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (init.adminToken) headers.set("x-admin-token", init.adminToken);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    (err as any).details = data?.details;
    (err as any).status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  // Public
  availability: (fecha: string) =>
    request<{ fecha: string; fullyBlocked: boolean; reason?: string; slots: { slot: string; available: boolean; reason?: string }[] }>(
      `/api/reservations/availability?fecha=${fecha}`
    ),
  monthAvailability: (year: number, month: number) =>
    request<{ year: number; month: number; blockedDates: string[] }>(
      `/api/reservations/availability/month?year=${year}&month=${month}`
    ),
  createReservation: (body: any) =>
    request<{ ok: true; id: string; token: string; manageUrl: string }>("/api/reservations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Manage by token
  getReservation: (token: string) =>
    request<{ reservation: any }>(`/api/manage/${token}`),
  updateReservation: (token: string, body: any) =>
    request<{ ok: true; reservation: any }>(`/api/manage/${token}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  cancelReservation: (token: string) =>
    request<{ ok: true }>(`/api/manage/${token}`, { method: "DELETE" }),

  // Admin
  adminLogin: (password: string) =>
    request<{ ok: true; token: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  adminStats: (t: string) => request<any>("/api/admin/stats", { adminToken: t }),
  adminReservations: (t: string) =>
    request<{ reservations: any[] }>("/api/admin/reservations", { adminToken: t }),
  adminDeleteReservation: (t: string, id: string) =>
    request<{ ok: true }>(`/api/admin/reservations/${id}`, { method: "DELETE", adminToken: t }),
  adminBlockedDates: (t: string) =>
    request<{ blockedDates: any[] }>("/api/admin/blocked-dates", { adminToken: t }),
  adminBlockDate: (t: string, body: { fecha: string; reason?: string; slots?: string[] }) =>
    request<{ ok: true; blockedDate: any }>("/api/admin/blocked-dates", {
      method: "POST",
      body: JSON.stringify(body),
      adminToken: t,
    }),
  adminUnblockDate: (t: string, fecha: string) =>
    request<{ ok: true }>(`/api/admin/blocked-dates/${fecha}`, { method: "DELETE", adminToken: t }),
};
