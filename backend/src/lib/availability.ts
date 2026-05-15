import { prisma } from "./db.js";
import { isChileanHoliday } from "./holidays.js";
import { getFeriadoForDate, getFeriadosFromSheet } from "./feriados-sheet.js";
import { getDbIdsPresentInSheet } from "./sheets.js";
import { deleteCalendarEvent } from "./calendar.js";

// Sheet → DB reconciliation: run at most once per minute. When the user
// manually deletes a row from the sheet, the matching DB reservation is
// purged (along with its calendar event) so the slot frees up.
const RECONCILE_TTL_MS = 60 * 1000;
const NEW_ROW_GRACE_MS = 60 * 1000; // don't delete rows younger than this
let lastReconcileAt = 0;
let reconcileInFlight: Promise<void> | null = null;

async function reconcileWithSheet(): Promise<void> {
  if (Date.now() - lastReconcileAt < RECONCILE_TTL_MS) return;
  if (reconcileInFlight) return reconcileInFlight;
  reconcileInFlight = (async () => {
    try {
      const sheetIds = await getDbIdsPresentInSheet();
      // Safety: if the sheet read failed or returned empty, don't delete anything.
      if (sheetIds.size === 0) return;
      const cutoff = new Date(Date.now() - NEW_ROW_GRACE_MS);
      const candidates = await prisma.reservation.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true, calendarEventId: true },
      });
      const orphans = candidates.filter((r) => !sheetIds.has(r.id));
      if (orphans.length === 0) return;
      for (const o of orphans) {
        if (o.calendarEventId) {
          await deleteCalendarEvent(o.calendarEventId).catch(() => null);
        }
      }
      await prisma.reservation.deleteMany({
        where: { id: { in: orphans.map((r) => r.id) } },
      });
      console.log(`[sync] removed ${orphans.length} DB rows missing from sheet`);
    } catch (err) {
      console.error("[sync] reconcile failed:", err);
    } finally {
      lastReconcileAt = Date.now();
      reconcileInFlight = null;
    }
  })();
  return reconcileInFlight;
}

export const ALL_SLOTS = ["10:00", "11:00", "12:00", "15:00", "16:00"] as const;
export const MORNING_SLOTS = ["10:00", "11:00", "12:00"] as const;
export const AFTERNOON_SLOTS = ["15:00", "16:00"] as const;
export const MORNING_CAP = 2;

export type SlotInfo = {
  slot: string;
  available: boolean;
  reason?: string;
};

/** dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday */
function dowFromISODate(fecha: string): number {
  // Treat as UTC midnight to avoid TZ drift in scheduling logic.
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function slotsForDayOfWeek(dow: number): readonly string[] {
  if (dow === 0 || dow === 1) return []; // Sun, Mon
  if (dow === 6) return ["10:00"];        // Saturday: only 10:00
  return ALL_SLOTS;                       // Tue–Fri
}

export function isMinAdvance(fecha: string, minDays = 7): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = fecha.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= minDays;
}

export async function getAvailability(fecha: string): Promise<{
  fecha: string;
  fullyBlocked: boolean;
  reason?: string;
  slots: SlotInfo[];
}> {
  // Lazy sync: detect sheet-side deletions before computing availability.
  await reconcileWithSheet();

  if (!isMinAdvance(fecha)) {
    return {
      fecha,
      fullyBlocked: true,
      reason: "Las reservas requieren al menos 7 días de anticipación.",
      slots: [],
    };
  }

  // Feriados sheet takes precedence over the hardcoded Chilean holiday list.
  const feriado = await getFeriadoForDate(fecha);
  if (feriado?.kind === "all") {
    return {
      fecha,
      fullyBlocked: true,
      reason: feriado.reason || "Cerrado todo el día",
      slots: [],
    };
  }

  // Hardcoded Chilean holidays as a backup if the sheet has no entry.
  if (!feriado && isChileanHoliday(fecha)) {
    return { fecha, fullyBlocked: true, reason: "Feriado nacional", slots: [] };
  }

  const dow = dowFromISODate(fecha);
  const validSlots = slotsForDayOfWeek(dow);
  if (validSlots.length === 0) {
    return {
      fecha,
      fullyBlocked: true,
      reason: dow === 0 || dow === 1 ? "Cerrado domingos y lunes" : "Sin horarios disponibles",
      slots: [],
    };
  }

  // Admin-managed blocked-date row?
  const blocked = await prisma.blockedDate.findUnique({ where: { fecha } });
  if (blocked && (blocked.slots === null || blocked.slots === "")) {
    return {
      fecha,
      fullyBlocked: true,
      reason: blocked.reason ?? "Fecha bloqueada",
      slots: [],
    };
  }

  const blockedSlots = new Set(
    blocked?.slots ? blocked.slots.split(",").map((s) => s.trim()) : []
  );

  // Active reservations on this date.
  const active = await prisma.reservation.findMany({
    where: { fechaVisita: fecha, cancelled: false },
    select: { horarioVisita: true },
  });
  const taken = new Set(active.map((r) => r.horarioVisita));
  const morningTaken = active.filter((r) =>
    (MORNING_SLOTS as readonly string[]).includes(r.horarioVisita)
  ).length;
  const morningCapHit = morningTaken >= MORNING_CAP;

  const feriadoBlocksMorning = feriado?.kind === "morning";
  const feriadoBlocksAfternoon = feriado?.kind === "afternoon";

  const slots: SlotInfo[] = validSlots.map((slot) => {
    if (taken.has(slot)) return { slot, available: false, reason: "Reservado" };
    if (blockedSlots.has(slot)) return { slot, available: false, reason: "Bloqueado" };
    if (feriadoBlocksMorning && (MORNING_SLOTS as readonly string[]).includes(slot)) {
      return { slot, available: false, reason: feriado!.reason || "Cerrado por la mañana" };
    }
    if (feriadoBlocksAfternoon && (AFTERNOON_SLOTS as readonly string[]).includes(slot)) {
      return { slot, available: false, reason: feriado!.reason || "Cerrado por la tarde" };
    }
    if ((MORNING_SLOTS as readonly string[]).includes(slot) && morningCapHit) {
      return { slot, available: false, reason: "Cupo de mañana lleno" };
    }
    return { slot, available: true };
  });

  const fullyBlocked = slots.every((s) => !s.available);
  return {
    fecha,
    fullyBlocked,
    reason: fullyBlocked && feriado ? feriado.reason : undefined,
    slots,
  };
}

export async function getMonthBlockedDates(
  year: number,
  month: number
): Promise<string[]> {
  // Lazy sync: detect sheet-side deletions before computing availability.
  await reconcileWithSheet();
  // Pre-warm the feriados cache with one Sheets read for the whole month
  // (otherwise each day would trigger a fresh lookup).
  await getFeriadosFromSheet();

  const monthStr = String(month).padStart(2, "0");
  const yearStr = String(year);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const fecha = `${yearStr}-${monthStr}-${String(d).padStart(2, "0")}`;
    const a = await getAvailability(fecha);
    if (a.fullyBlocked) dates.push(fecha);
  }
  return dates;
}
