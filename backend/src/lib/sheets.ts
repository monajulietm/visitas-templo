// Google Sheets logging. No-op if env vars not set.
// Mirrors the existing "Registro de Grupos" sheet structure (17 cols, A-Q).

import { google } from "googleapis";
import type { Reservation } from "@prisma/client";

const SHEET_TAB_DEFAULT = "Registro de Grupos";

function getClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !email || !key) return null;
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const tab = process.env.GOOGLE_SHEET_TAB || SHEET_TAB_DEFAULT;
  return { auth, sheetId, tab };
}

/** Excel/Google Sheets serial number for a Date (days since 1899-12-30, fractional = time of day). */
function toSheetSerial(d: Date): number {
  const epoch = Date.UTC(1899, 11, 30);
  return (d.getTime() - epoch) / 86400000;
}

/** Bahá'í Era year — Naw-Rúz approximation (March 21 cutoff). */
function bahaiEraYear(d: Date): number {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-indexed
  const day = d.getDate();
  if (m > 2 || (m === 2 && day >= 21)) return y - 1843;
  return y - 1844;
}

/** dd/MM/yyyy from a YYYY-MM-DD string, no zero-padding on the day (matches existing rows). */
function formatVisitDate(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-");
  return `${parseInt(d, 10)}/${m}/${y}`;
}

export async function logReservationToSheet(r: Reservation): Promise<void> {
  const ctx = getClient();
  if (!ctx) {
    console.log(`[sheets:stub] would log reservation ${r.id} (set GOOGLE_SHEET_ID etc. to enable)`);
    return;
  }
  try {
    // Compose a Date that represents the visit (not submission) timestamp,
    // since CODIGO in legacy rows tracks the visit slot.
    const [vy, vm, vd] = r.fechaVisita.split("-").map(Number);
    const [hh, mm] = r.horarioVisita.split(":").map(Number);
    const visitAt = new Date(vy, vm - 1, vd, hh, mm, 0, 0);

    const codigo = toSheetSerial(visitAt);
    const mesVisita = vm;            // integer 1-12
    const anioVisita = vy;           // integer
    const periodoEB = bahaiEraYear(visitAt);

    const row = [
      codigo,                              // A — CODIGO (Fecha-Hora)
      formatVisitDate(r.fechaVisita),      // B — Fecha Visita
      r.horarioVisita,                     // C — Hora
      r.nroPersonas,                       // D — N° Personas
      r.encargadoVisita,                   // E — Nombre
      r.correoElectronico,                 // F — Correo
      `'${r.telefonoContacto}`,            // G — N° de teléfono (apostrophe-prefix so Sheets keeps the leading "+" as text, not formula)
      r.nombreInstitucion,                 // H — Nombre de la Institución
      r.sectorInstitucion,                 // I — Sector de la Institución
      r.comuna,                            // J — Comuna
      r.rangoEdades,                       // K — Grupo de edad
      r.idiomaVisita,                      // L — Idioma
      r.propositoVisita,                   // M — Propósito de la visita
      mesVisita,                           // N — Mes Visita
      anioVisita,                          // O — Año Vista
      periodoEB,                           // P — Periodo EB
      r.id,                                // Q — Event ID (DB reservation id, used to find this row again later)
    ];

    const sheets = google.sheets({ version: "v4", auth: ctx.auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: ctx.sheetId,
      range: `${ctx.tab}!A:Q`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } catch (err) {
    console.error("[sheets] append failed:", err);
  }
}

/** 1-indexed row number where reservation `id` lives in column Q. -1 if not found. */
async function findRowByReservationId(id: string): Promise<number> {
  const ctx = getClient();
  if (!ctx) return -1;
  const sheets = google.sheets({ version: "v4", auth: ctx.auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ctx.sheetId,
    range: `${ctx.tab}!Q:Q`,
  });
  const col = res.data.values ?? [];
  for (let i = 0; i < col.length; i++) {
    if ((col[i]?.[0] ?? "") === id) return i + 1; // sheet rows are 1-indexed
  }
  return -1;
}

/** Update an existing Sheet row in place to reflect new date/time/personas. */
export async function updateReservationInSheet(r: Reservation): Promise<void> {
  const ctx = getClient();
  if (!ctx) {
    console.log(`[sheets:stub] would update row for reservation ${r.id}`);
    return;
  }
  try {
    const rowNumber = await findRowByReservationId(r.id);
    if (rowNumber < 1) {
      console.warn(`[sheets] no row found for reservation ${r.id} — falling back to append`);
      await logReservationToSheet(r);
      return;
    }
    const [vy, vm, vd] = r.fechaVisita.split("-").map(Number);
    const [hh, mm] = r.horarioVisita.split(":").map(Number);
    const visitAt = new Date(vy, vm - 1, vd, hh, mm, 0, 0);
    const codigo = toSheetSerial(visitAt);
    const periodoEB = bahaiEraYear(visitAt);

    const sheets = google.sheets({ version: "v4", auth: ctx.auth });
    // Update only the fields the manage page can change: A, B, C, D, N, O, P (date-derived + personas).
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: ctx.sheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          { range: `${ctx.tab}!A${rowNumber}`, values: [[codigo]] },
          { range: `${ctx.tab}!B${rowNumber}`, values: [[formatVisitDate(r.fechaVisita)]] },
          { range: `${ctx.tab}!C${rowNumber}`, values: [[r.horarioVisita]] },
          { range: `${ctx.tab}!D${rowNumber}`, values: [[r.nroPersonas]] },
          { range: `${ctx.tab}!N${rowNumber}`, values: [[vm]] },
          { range: `${ctx.tab}!O${rowNumber}`, values: [[vy]] },
          { range: `${ctx.tab}!P${rowNumber}`, values: [[periodoEB]] },
        ],
      },
    });
  } catch (err) {
    console.error("[sheets] update failed:", err);
  }
}

/** Mark the reservation row as cancelled in-place by prefixing the Nombre column. */
export async function markReservationCancelledInSheet(r: Reservation): Promise<void> {
  const ctx = getClient();
  if (!ctx) {
    console.log(`[sheets:stub] would mark row cancelled for reservation ${r.id}`);
    return;
  }
  try {
    const rowNumber = await findRowByReservationId(r.id);
    if (rowNumber < 1) {
      console.warn(`[sheets] no row found for reservation ${r.id} (cancellation)`);
      return;
    }
    const sheets = google.sheets({ version: "v4", auth: ctx.auth });
    // If the encargado isn't already prefixed, add "[CANCELADA] ".
    const current = await sheets.spreadsheets.values.get({
      spreadsheetId: ctx.sheetId,
      range: `${ctx.tab}!E${rowNumber}`,
    });
    const existing = (current.data.values?.[0]?.[0] ?? "") as string;
    if (existing.startsWith("[CANCELADA]")) return;
    await sheets.spreadsheets.values.update({
      spreadsheetId: ctx.sheetId,
      range: `${ctx.tab}!E${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[`[CANCELADA] ${existing}`]] },
    });
  } catch (err) {
    console.error("[sheets] cancel-mark failed:", err);
  }
}

/** Read all rows of the registry tab. Used by import + audit scripts. */
export async function readAllReservationRows(): Promise<{ row: any[]; rowNumber: number }[]> {
  const ctx = getClient();
  if (!ctx) return [];
  const sheets = google.sheets({ version: "v4", auth: ctx.auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ctx.sheetId,
    range: `${ctx.tab}!A3:Q`, // skip the title (row 1) and header (row 2) rows
  });
  const values = res.data.values ?? [];
  return values.map((row, i) => ({ row, rowNumber: i + 3 }));
}

/** Write back into a row's Event ID column. Used by the import script. */
export async function setRowEventId(rowNumber: number, id: string): Promise<void> {
  const ctx = getClient();
  if (!ctx) return;
  const sheets = google.sheets({ version: "v4", auth: ctx.auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: ctx.sheetId,
    range: `${ctx.tab}!Q${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[id]] },
  });
}

/** Verify connectivity and that the service account can read the configured tab. */
export async function pingSheet(): Promise<{ ok: boolean; detail: string }> {
  const ctx = getClient();
  if (!ctx) return { ok: false, detail: "GOOGLE_SHEET_ID / SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY not set" };
  try {
    const sheets = google.sheets({ version: "v4", auth: ctx.auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId: ctx.sheetId });
    const tabNames = (meta.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[];
    if (!tabNames.includes(ctx.tab)) {
      return { ok: false, detail: `Tab "${ctx.tab}" not found. Available: ${tabNames.join(", ")}` };
    }
    return { ok: true, detail: `Connected to "${meta.data.properties?.title}" → tab "${ctx.tab}"` };
  } catch (err: any) {
    return { ok: false, detail: err?.message || String(err) };
  }
}
