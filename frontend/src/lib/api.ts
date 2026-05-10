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

};
