import { Hono } from "hono";
import { prisma } from "../lib/db.js";
import { ReservationUpdateSchema } from "../lib/schemas.js";
import { getAvailability, isMinAdvance } from "../lib/availability.js";
import { sendUpdateEmail } from "../lib/email.js";
import { isChileanHoliday } from "../lib/holidays.js";
import { updateReservationInSheet, deleteReservationRowInSheet } from "../lib/sheets.js";

export const manageRoutes = new Hono();

manageRoutes.get("/:token", async (c) => {
  const token = c.req.param("token");
  const r = await prisma.reservation.findUnique({ where: { token } });
  if (!r) return c.json({ error: "Reserva no encontrada" }, 404);
  return c.json({ reservation: r });
});

manageRoutes.patch("/:token", async (c) => {
  const token = c.req.param("token");
  const r = await prisma.reservation.findUnique({ where: { token } });
  if (!r) return c.json({ error: "Reserva no encontrada" }, 404);
  if (r.cancelled) return c.json({ error: "La reserva está cancelada" }, 400);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const parsed = ReservationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validación fallida", details: parsed.error.flatten() }, 400);
  }
  const update = parsed.data;

  const newDate = update.fechaVisita ?? r.fechaVisita;
  const newSlot = update.horarioVisita ?? r.horarioVisita;

  if (update.fechaVisita || update.horarioVisita) {
    if (!isMinAdvance(newDate)) {
      return c.json(
        { error: "La nueva fecha requiere al menos 7 días de anticipación." },
        400
      );
    }
    if (isChileanHoliday(newDate)) {
      return c.json({ error: "Esa fecha corresponde a un feriado nacional." }, 400);
    }
    const a = await getAvailability(newDate);
    const slot = a.slots.find((s) => s.slot === newSlot);
    // The current reservation already occupies its slot — allow keeping the same.
    const isSameAsCurrent = newDate === r.fechaVisita && newSlot === r.horarioVisita;
    if (!isSameAsCurrent && (!slot || !slot.available)) {
      return c.json({ error: slot?.reason ?? "Horario no disponible" }, 409);
    }
  }

  const updated = await prisma.reservation.update({
    where: { token },
    data: {
      ...(update.fechaVisita && { fechaVisita: update.fechaVisita }),
      ...(update.horarioVisita && { horarioVisita: update.horarioVisita }),
      ...(update.nroPersonas && { nroPersonas: update.nroPersonas }),
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8000";
  void sendUpdateEmail(updated, frontendUrl);
  void updateReservationInSheet(updated);

  return c.json({ ok: true, reservation: updated });
});

manageRoutes.delete("/:token", async (c) => {
  const token = c.req.param("token");
  const r = await prisma.reservation.findUnique({ where: { token } });
  if (!r) return c.json({ error: "Reserva no encontrada" }, 404);
  // Delete the sheet row first (best effort), then hard-delete the DB row.
  await deleteReservationRowInSheet(r);
  await prisma.reservation.delete({ where: { token } });
  return c.json({ ok: true });
});
