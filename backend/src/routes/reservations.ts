import { Hono } from "hono";
import { prisma } from "../lib/db.js";
import {
  getAvailability,
  getMonthBlockedDates,
  isMinAdvance,
  slotsForDayOfWeek,
  MORNING_SLOTS,
  MORNING_CAP,
} from "../lib/availability.js";
import { ReservationCreateSchema } from "../lib/schemas.js";
import { newReservationToken } from "../lib/auth.js";
import { verifyCaptcha } from "../lib/captcha.js";
import { sendConfirmationEmail } from "../lib/email.js";
import { logReservationToSheet } from "../lib/sheets.js";
import { createCalendarEvent } from "../lib/calendar.js";
import { isChileanHoliday } from "../lib/holidays.js";

export const reservationRoutes = new Hono();

reservationRoutes.get("/availability", async (c) => {
  const fecha = c.req.query("fecha");
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return c.json({ error: "fecha (YYYY-MM-DD) is required" }, 400);
  }
  const a = await getAvailability(fecha);
  return c.json(a);
});

reservationRoutes.get("/availability/month", async (c) => {
  const year = Number(c.req.query("year"));
  const month = Number(c.req.query("month"));
  if (!year || !month || month < 1 || month > 12) {
    return c.json({ error: "year and month (1-12) required" }, 400);
  }
  const blocked = await getMonthBlockedDates(year, month);
  return c.json({ year, month, blockedDates: blocked });
});

reservationRoutes.post("/", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "anon";

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const parsed = ReservationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validación fallida", details: parsed.error.flatten() }, 400);
  }
  const data = parsed.data;

  // Honeypot — silently accept-and-discard so bots don't probe.
  if (data.website && data.website.trim().length > 0) {
    return c.json({ ok: true, stub: true }, 200);
  }

  // Captcha (no-op if not configured).
  const captchaOk = await verifyCaptcha(data.captchaToken, ip);
  if (!captchaOk) {
    return c.json({ error: "Verificación CAPTCHA fallida" }, 400);
  }

  // Business-rule validation
  if (!isMinAdvance(data.fechaVisita)) {
    return c.json(
      { error: "Las reservas requieren al menos 7 días de anticipación." },
      400
    );
  }
  if (isChileanHoliday(data.fechaVisita)) {
    return c.json({ error: "Esa fecha corresponde a un feriado nacional." }, 400);
  }
  const dow = new Date(`${data.fechaVisita}T00:00:00Z`).getUTCDay();
  const valid = slotsForDayOfWeek(dow);
  if (!valid.includes(data.horarioVisita)) {
    return c.json({ error: "Ese horario no está disponible para la fecha elegida." }, 400);
  }

  // Re-check availability against current DB state (atomicity-ish).
  const a = await getAvailability(data.fechaVisita);
  const slot = a.slots.find((s) => s.slot === data.horarioVisita);
  if (!slot || !slot.available) {
    return c.json({ error: slot?.reason ?? "Horario no disponible" }, 409);
  }

  // Morning cap re-check.
  if ((MORNING_SLOTS as readonly string[]).includes(data.horarioVisita)) {
    const morningCount = await prisma.reservation.count({
      where: {
        fechaVisita: data.fechaVisita,
        cancelled: false,
        horarioVisita: { in: [...MORNING_SLOTS] },
      },
    });
    if (morningCount >= MORNING_CAP) {
      return c.json({ error: "El cupo de horarios de la mañana está lleno." }, 409);
    }
  }

  const token = newReservationToken();
  const reservation = await prisma.reservation.create({
    data: {
      token,
      nombreInstitucion: data.nombreInstitucion,
      sectorInstitucion: data.sectorInstitucion,
      fechaVisita: data.fechaVisita,
      horarioVisita: data.horarioVisita,
      nroPersonas: data.nroPersonas,
      rangoEdades: data.rangoEdades,
      region: data.region,
      comuna: data.comuna,
      encargadoVisita: data.encargadoVisita,
      idiomaVisita: data.idiomaVisita,
      propositoVisita: data.propositoVisita,
      telefonoContacto: data.telefonoContacto,
      correoElectronico: data.correoElectronico,
      requerimientoParticular: data.requerimientoParticular ?? null,
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8000";
  // Fire-and-forget side effects.
  void sendConfirmationEmail(reservation, frontendUrl);
  void logReservationToSheet(reservation);
  // Calendar: create event, then store its id on the reservation (best effort).
  void createCalendarEvent(reservation).then(async (eventId) => {
    if (eventId) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { calendarEventId: eventId },
      }).catch((e) => console.error("[reservations] failed to save calendarEventId:", e));
    }
  });

  return c.json({
    ok: true,
    id: reservation.id,
    token: reservation.token,
    manageUrl: `${frontendUrl}/manage/${reservation.token}`,
  });
});
