import { Hono } from "hono";
import type { Context, Next } from "hono";
import { prisma } from "../lib/db.js";
import { AdminLoginSchema, BlockedDateSchema } from "../lib/schemas.js";
import { issueAdminToken, isValidAdminToken, verifyAdminPassword, newReservationToken } from "../lib/auth.js";
import { rateLimit } from "../lib/rate-limit.js";
import { readAllReservationRows, setRowEventId } from "../lib/sheets.js";

export const adminRoutes = new Hono();

async function requireAdmin(c: Context, next: Next) {
  const token = c.req.header("x-admin-token");
  if (!isValidAdminToken(token)) {
    return c.json({ error: "No autorizado" }, 401);
  }
  await next();
}

adminRoutes.post("/login", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "anon";
  const rl = rateLimit("admin-login", ip, { max: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) {
    return c.json({ error: "Demasiados intentos. Intente más tarde." }, 429);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const parsed = AdminLoginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Contraseña requerida" }, 400);

  if (!verifyAdminPassword(parsed.data.password)) {
    return c.json({ error: "Credenciales incorrectas" }, 401);
  }
  const token = issueAdminToken();
  return c.json({ ok: true, token });
});

adminRoutes.use("/*", async (c, next) => {
  if (c.req.path.endsWith("/login")) return next();
  return requireAdmin(c, next);
});

adminRoutes.get("/reservations", async (c) => {
  const all = await prisma.reservation.findMany({
    orderBy: [{ fechaVisita: "asc" }, { horarioVisita: "asc" }],
  });
  return c.json({ reservations: all });
});

adminRoutes.delete("/reservations/:id", async (c) => {
  const id = c.req.param("id");
  await prisma.reservation.delete({ where: { id } }).catch(() => null);
  return c.json({ ok: true });
});

adminRoutes.get("/blocked-dates", async (c) => {
  const list = await prisma.blockedDate.findMany({ orderBy: { fecha: "asc" } });
  return c.json({ blockedDates: list });
});

adminRoutes.post("/blocked-dates", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const parsed = BlockedDateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validación fallida", details: parsed.error.flatten() }, 400);
  }
  const { fecha, reason, slots } = parsed.data;
  const slotStr = slots && slots.length > 0 ? slots.join(",") : null;

  const existing = await prisma.blockedDate.findUnique({ where: { fecha } });
  const row = existing
    ? await prisma.blockedDate.update({
        where: { fecha },
        data: { reason: reason ?? null, slots: slotStr },
      })
    : await prisma.blockedDate.create({
        data: { fecha, reason: reason ?? null, slots: slotStr },
      });
  return c.json({ ok: true, blockedDate: row });
});

adminRoutes.delete("/blocked-dates/:fecha", async (c) => {
  const fecha = c.req.param("fecha");
  await prisma.blockedDate.delete({ where: { fecha } }).catch(() => null);
  return c.json({ ok: true });
});

adminRoutes.post("/import-sheet", async (c) => {
  const futureOnly = c.req.query("future") !== "0"; // default true
  const todayISO = new Date().toISOString().slice(0, 10);
  const rows = await readAllReservationRows();

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { row, rowNumber } of rows) {
    try {
      const existingId = String(row[16] ?? "").trim();
      if (existingId) { skipped++; continue; }

      const fechaRaw = String(row[1] ?? "").trim();
      const fechaMatch = fechaRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (!fechaMatch) { skipped++; continue; }
      const fecha = `${fechaMatch[3]}-${fechaMatch[2].padStart(2, "0")}-${fechaMatch[1].padStart(2, "0")}`;

      if (futureOnly && fecha < todayISO) { skipped++; continue; }

      const horaRaw = String(row[2] ?? "").trim().replace(".", ":");
      const horaMatch = horaRaw.match(/^(\d{1,2})(?::(\d{2}))?$/);
      if (!horaMatch) { skipped++; continue; }
      const hora = `${String(parseInt(horaMatch[1], 10)).padStart(2, "0")}:${horaMatch[2] ?? "00"}`;

      const personas = parseInt(String(row[3] ?? "0").trim(), 10) || 0;
      if (personas < 1) { skipped++; continue; }

      const created_row = await prisma.reservation.create({
        data: {
          token: newReservationToken(),
          nombreInstitucion: String(row[7] ?? "").trim() || "(desconocida)",
          sectorInstitucion: String(row[8] ?? "").trim() || "(desconocido)",
          fechaVisita: fecha,
          horarioVisita: hora,
          nroPersonas: personas,
          rangoEdades: String(row[10] ?? "").trim() || "(desconocido)",
          region: "(histórico)",
          comuna: String(row[9] ?? "").trim() || "(desconocida)",
          encargadoVisita: String(row[4] ?? "").trim() || "(desconocido)",
          idiomaVisita: String(row[11] ?? "").trim() || "Español",
          propositoVisita: String(row[12] ?? "").trim() || "(desconocido)",
          telefonoContacto: String(row[6] ?? "").trim().replace(/^'/, ""),
          correoElectronico: String(row[5] ?? "").trim() || "noemail@example.com",
          requerimientoParticular: null,
          cancelled: String(row[4] ?? "").startsWith("[CANCELADA]"),
        },
      });
      await setRowEventId(rowNumber, created_row.id).catch((e) => {
        errors.push(`row ${rowNumber}: created in DB but failed to write back to Sheet: ${(e as Error).message}`);
      });
      created++;
    } catch (e: any) {
      errors.push(`row ${rowNumber}: ${e?.message ?? e}`);
      skipped++;
    }
  }

  return c.json({
    ok: true,
    futureOnly,
    todayISO,
    totalRowsRead: rows.length,
    created,
    skipped,
    errors,
  });
});

adminRoutes.get("/stats", async (c) => {
  const [total, active, cancelled] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { cancelled: false } }),
    prisma.reservation.count({ where: { cancelled: true } }),
  ]);
  const upcoming = await prisma.reservation.count({
    where: {
      cancelled: false,
      fechaVisita: { gte: new Date().toISOString().slice(0, 10) },
    },
  });
  const totalVisitors = await prisma.reservation.aggregate({
    where: { cancelled: false },
    _sum: { nroPersonas: true },
  });
  return c.json({
    total,
    active,
    cancelled,
    upcoming,
    totalVisitors: totalVisitors._sum.nroPersonas ?? 0,
  });
});
