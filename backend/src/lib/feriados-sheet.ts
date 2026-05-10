// Reads the "Feriados" tab from the same Google Sheet as the registry.
// Each row drives whether a date is fully closed or partially closed.

import { google } from "googleapis";

const TAB_DEFAULT = "Feriados";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type ClosureKind = "all" | "morning" | "afternoon";
export type FeriadoRow = { fecha: string; kind: ClosureKind; reason: string };

let cache: { rows: FeriadoRow[]; expiresAt: number } | null = null;

function getClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !email || !key) return null;
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const tab = process.env.GOOGLE_FERIADOS_TAB || TAB_DEFAULT;
  return { auth, sheetId, tab };
}

/** Convert "1/01/2026" or "01/01/2026" → "2026-01-01". */
function parseFechaDDMMYYYY(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function classifyClosure(text: string): ClosureKind | null {
  const t = text.toLowerCase();
  if (t.includes("todo el d")) return "all";          // "todo el día" / "todo el dia"
  if (t.includes("tarde")) return "afternoon";
  if (t.includes("mañana") || t.includes("manana")) return "morning";
  return null;
}

export async function getFeriadosFromSheet(): Promise<FeriadoRow[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.rows;
  const ctx = getClient();
  if (!ctx) {
    cache = { rows: [], expiresAt: Date.now() + CACHE_TTL_MS };
    return [];
  }
  try {
    const sheets = google.sheets({ version: "v4", auth: ctx.auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: ctx.sheetId,
      range: `${ctx.tab}!A2:C`, // skip the header row
    });
    const rows = (res.data.values ?? [])
      .map((r): FeriadoRow | null => {
        const fecha = parseFechaDDMMYYYY(String(r[0] ?? ""));
        const kind = classifyClosure(String(r[1] ?? ""));
        if (!fecha || !kind) return null;
        return { fecha, kind, reason: String(r[2] ?? "").trim() };
      })
      .filter((x): x is FeriadoRow => x !== null);
    cache = { rows, expiresAt: Date.now() + CACHE_TTL_MS };
    return rows;
  } catch (err) {
    console.error("[feriados] fetch failed:", err);
    // Fall back to whatever we had previously (or empty).
    return cache?.rows ?? [];
  }
}

export async function getFeriadoForDate(fecha: string): Promise<FeriadoRow | null> {
  const list = await getFeriadosFromSheet();
  // If a date appears multiple times in the sheet, the last entry wins.
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].fecha === fecha) return list[i];
  }
  return null;
}

export function clearFeriadosCache() {
  cache = null;
}
