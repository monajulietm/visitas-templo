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
      "",                                  // Q — Event ID (legacy Google Calendar IDs live here, leave blank for new rows)
      r.id,                                // R — DB reservation id (our system uses this column)
    ];

    const sheets = google.sheets({ version: "v4", auth: ctx.auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: ctx.sheetId,
      range: `${ctx.tab}!A:R`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } catch (err) {
    console.error("[sheets] append failed:", err);
  }
}

/** 1-indexed row number where reservation `id` lives. Checks column R first
 * (current home for DB IDs), then column Q for backward compatibility with
 * any rows that wrote into Q before the column-R migration. */
async function findRowByReservationId(id: string): Promise<number> {
  const ctx = getClient();
  if (!ctx) return -1;
  const sheets = google.sheets({ version: "v4", auth: ctx.auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ctx.sheetId,
    range: `${ctx.tab}!Q:R`,
  });
  const col = res.data.values ?? [];
  for (let i = 0; i < col.length; i++) {
    const q = col[i]?.[0] ?? "";
    const r = col[i]?.[1] ?? "";
    if (r === id || q === id) return i + 1; // sheet rows are 1-indexed
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

/** Delete the reservation's row from the sheet entirely. Used when a visitor
 * cancels — leaves no trace in either the DB or the sheet. */
export async function deleteReservationRowInSheet(r: Reservation): Promise<void> {
  const ctx = getClient();
  if (!ctx) {
    console.log(`[sheets:stub] would delete row for reservation ${r.id}`);
    return;
  }
  try {
    const rowNumber = await findRowByReservationId(r.id);
    if (rowNumber < 1) {
      console.warn(`[sheets] no row found for reservation ${r.id} (delete)`);
      return;
    }
    const sheets = google.sheets({ version: "v4", auth: ctx.auth });
    // Need the tab's numeric sheetId for the deleteDimension request.
    const meta = await sheets.spreadsheets.get({ spreadsheetId: ctx.sheetId });
    const tab = meta.data.sheets?.find((s) => s.properties?.title === ctx.tab);
    const sheetIdNumeric = tab?.properties?.sheetId;
    if (sheetIdNumeric == null) {
      console.warn(`[sheets] could not resolve numeric sheetId for tab "${ctx.tab}"`);
      return;
    }
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ctx.sheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetIdNumeric,
              dimension: "ROWS",
              startIndex: rowNumber - 1, // API expects 0-indexed
              endIndex: rowNumber,
            },
          },
        }],
      },
    });
  } catch (err) {
    console.error("[sheets] delete-row failed:", err);
  }
}

/** Read all rows of the registry tab. Used by import + audit scripts. */
export async function readAllReservationRows(): Promise<{ row: any[]; rowNumber: number }[]> {
  const ctx = getClient();
  if (!ctx) return [];
  const sheets = google.sheets({ version: "v4", auth: ctx.auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ctx.sheetId,
    range: `${ctx.tab}!A3:R`, // skip title row + header row; include the new column R
  });
  const values = res.data.values ?? [];
  return values.map((row, i) => ({ row, rowNumber: i + 3 }));
}

/** Write our DB reservation id into column R for a given row. */
export async function setRowEventId(rowNumber: number, id: string): Promise<void> {
  const ctx = getClient();
  if (!ctx) return;
  const sheets = google.sheets({ version: "v4", auth: ctx.auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: ctx.sheetId,
    range: `${ctx.tab}!R${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[id]] },
  });
}

/** Return every DB reservation id currently present in the sheet's columns Q
 * and R. Used by the reconcile loop to detect rows the user deleted manually. */
export async function getDbIdsPresentInSheet(): Promise<Set<string>> {
  const ctx = getClient();
  if (!ctx) return new Set();
  try {
    const sheets = google.sheets({ version: "v4", auth: ctx.auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: ctx.sheetId,
      range: `${ctx.tab}!Q:R`,
    });
    const col = res.data.values ?? [];
    const ids = new Set<string>();
    for (const row of col) {
      const q = String(row?.[0] ?? "").trim();
      const r = String(row?.[1] ?? "").trim();
      // Skip Google Calendar IDs (legacy values in column Q have "@" in them)
      if (q && !q.includes("@")) ids.add(q);
      if (r && !r.includes("@")) ids.add(r);
    }
    return ids;
  } catch (err) {
    console.error("[sheets] getDbIdsPresentInSheet failed:", err);
    return new Set();
  }
}

/** Clear column R for any rows whose DB id is in the given set. Best-effort. */
export async function clearRowEventIdsForDbIds(dbIds: Set<string>): Promise<number> {
  if (dbIds.size === 0) return 0;
  const ctx = getClient();
  if (!ctx) return 0;
  const sheets = google.sheets({ version: "v4", auth: ctx.auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ctx.sheetId,
    range: `${ctx.tab}!R:R`,
  });
  const col = res.data.values ?? [];
  const ranges: string[] = [];
  for (let i = 0; i < col.length; i++) {
    const v = (col[i]?.[0] ?? "").trim();
    if (v && dbIds.has(v)) ranges.push(`${ctx.tab}!R${i + 1}`);
  }
  if (ranges.length === 0) return 0;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: ctx.sheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: ranges.map((range) => ({ range, values: [[""]] })),
    },
  });
  return ranges.length;
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
