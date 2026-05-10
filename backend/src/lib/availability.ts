import { prisma } from "./db.js";
import { isChileanHoliday } from "./holidays.js";
import { getFeriadoForDate, getFeriadosFromSheet } from "./feriados-sheet.js";

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
