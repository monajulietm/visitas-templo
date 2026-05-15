// Google Calendar integration. Creates/updates/deletes an event on the
// configured calendar whenever a reservation is created/edited/cancelled.
// Adds Mona's email (CALENDAR_INVITE_EMAIL) as an attendee so she gets the
// Google Calendar invite automatically.

import { google } from "googleapis";
import type { Reservation } from "@prisma/client";

const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"];

function getClient() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!calendarId || !email || !key) return null;
  const auth = new google.auth.JWT({ email, key, scopes: CALENDAR_SCOPES });
  return { auth, calendarId };
}

/** Format a local datetime as "YYYY-MM-DDTHH:MM:00" (no Z), pairs with timeZone. */
function toLocalIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

const VISIT_DURATION_MINUTES = 90;
const TIMEZONE = "America/Santiago";

function buildEventBody(r: Reservation) {
  const [y, m, d] = r.fechaVisita.split("-").map(Number);
  const [hh, mm] = r.horarioVisita.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm, 0, 0);
  const end = new Date(start.getTime() + VISIT_DURATION_MINUTES * 60 * 1000);

  const attendees: { email: string }[] = [];
  if (process.env.CALENDAR_INVITE_EMAIL) {
    attendees.push({ email: process.env.CALENDAR_INVITE_EMAIL });
  }
  if (r.correoElectronico && /@/.test(r.correoElectronico)) {
    attendees.push({ email: r.correoElectronico });
  }

  const descriptionLines = [
    `Encargado: ${r.encargadoVisita}`,
    `Institución: ${r.nombreInstitucion}`,
    `Sector: ${r.sectorInstitucion}`,
    `Personas: ${r.nroPersonas}`,
    `Rango de edades: ${r.rangoEdades}`,
    `Idioma: ${r.idiomaVisita}`,
    `Propósito: ${r.propositoVisita}`,
    `Región / Comuna: ${r.region} / ${r.comuna}`,
    `Teléfono: ${r.telefonoContacto}`,
    `Correo: ${r.correoElectronico}`,
  ];
  if (r.requerimientoParticular) {
    descriptionLines.push(`Requerimientos: ${r.requerimientoParticular}`);
  }

  return {
    summary: `Visita: ${r.nombreInstitucion} (${r.nroPersonas} pers.)`,
    description: descriptionLines.join("\n"),
    location: "Templo Bahá'í de Sudamérica, Av. Diag. Las Torres 2000, Peñalolén, Santiago, Chile",
    start: { dateTime: toLocalIso(start), timeZone: TIMEZONE },
    end: { dateTime: toLocalIso(end), timeZone: TIMEZONE },
    attendees,
  };
}

/** Create a calendar event for a new reservation. Returns the event ID. */
export async function createCalendarEvent(r: Reservation): Promise<string | null> {
  const ctx = getClient();
  if (!ctx) {
    console.log(`[calendar:stub] would create event for ${r.id}`);
    return null;
  }
  try {
    const calendar = google.calendar({ version: "v3", auth: ctx.auth });
    const res = await calendar.events.insert({
      calendarId: ctx.calendarId,
      sendUpdates: "all",       // emails the attendees the invite
      requestBody: buildEventBody(r),
    });
    return res.data.id ?? null;
  } catch (err) {
    console.error("[calendar] create failed:", err);
    return null;
  }
}

/** Update an existing calendar event when reservation details change. */
export async function updateCalendarEvent(r: Reservation): Promise<void> {
  if (!r.calendarEventId) return;
  const ctx = getClient();
  if (!ctx) return;
  try {
    const calendar = google.calendar({ version: "v3", auth: ctx.auth });
    await calendar.events.update({
      calendarId: ctx.calendarId,
      eventId: r.calendarEventId,
      sendUpdates: "all",
      requestBody: buildEventBody(r),
    });
  } catch (err) {
    console.error("[calendar] update failed:", err);
  }
}

/** Delete a calendar event when a reservation is cancelled. */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const ctx = getClient();
  if (!ctx) return;
  try {
    const calendar = google.calendar({ version: "v3", auth: ctx.auth });
    await calendar.events.delete({
      calendarId: ctx.calendarId,
      eventId,
      sendUpdates: "all",
    });
  } catch (err) {
    console.error("[calendar] delete failed:", err);
  }
}

/** Quick connectivity check for a setup script. */
export async function pingCalendar(): Promise<{ ok: boolean; detail: string }> {
  const ctx = getClient();
  if (!ctx) return { ok: false, detail: "GOOGLE_CALENDAR_ID / SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY not set" };
  try {
    const calendar = google.calendar({ version: "v3", auth: ctx.auth });
    const cal = await calendar.calendars.get({ calendarId: ctx.calendarId });
    return { ok: true, detail: `Connected to calendar "${cal.data.summary}"` };
  } catch (err: any) {
    return { ok: false, detail: err?.message || String(err) };
  }
}
