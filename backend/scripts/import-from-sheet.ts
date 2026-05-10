// One-time importer: read every row from "Registro de Grupos" and create
// matching DB rows. After import, every Sheet row will have its DB id in
// column Q so future edits/cancellations can find it.
//
//   bun run sheet:import                 (dry run, all rows)
//   bun run sheet:import --apply         (write all rows)
//   bun run sheet:import --future        (dry run, only dates from today onward)
//   bun run sheet:import --future --apply (write only future rows)

import { prisma } from "../src/lib/db.js";
import { readAllReservationRows, setRowEventId } from "../src/lib/sheets.js";
import { newReservationToken } from "../src/lib/auth.js";

const APPLY = process.argv.includes("--apply");
const FUTURE_ONLY = process.argv.includes("--future");
const TODAY_ISO = new Date().toISOString().slice(0, 10);

/** "9/09/2022" or "9-09-2022" → "2022-09-09". Accepts dd/MM/yyyy or d/M/yyyy. */
function parseFecha(s: string): string | null {
  const m = (s ?? "").trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** "11:00" or "11.00" or "11" → "11:00". Otherwise null. */
function parseHora(s: string): string | null {
  if (!s) return null;
  const t = s.trim().replace(".", ":");
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  if (h < 0 || h > 23) return null;
  return `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
}

async function main() {
  const rows = await readAllReservationRows();
  console.log(`📋 Found ${rows.length} rows in Sheet "Registro de Grupos".`);
  if (FUTURE_ONLY) console.log(`   Filtering to dates ≥ ${TODAY_ISO} (today).`);

  let toCreate = 0;
  let skipped = 0;
  let updates: { rowNumber: number; id: string }[] = [];

  for (const { row, rowNumber } of rows) {
    const existingEventId = (row[16] ?? "").trim();
    if (existingEventId) {
      skipped++;
      continue; // already imported
    }

    const fecha = parseFecha(row[1]);
    const hora = parseHora(row[2]);
    if (!fecha || !hora) {
      console.warn(`  row ${rowNumber}: skipping — bad fecha/hora (${row[1]} / ${row[2]})`);
      skipped++;
      continue;
    }
    if (FUTURE_ONLY && fecha < TODAY_ISO) {
      skipped++;
      continue;
    }
    const personas = parseInt(String(row[3] ?? "0").trim(), 10) || 0;
    if (personas < 1) {
      console.warn(`  row ${rowNumber}: skipping — bad N° Personas (${row[3]})`);
      skipped++;
      continue;
    }

    const data = {
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
      requerimientoParticular: null as string | null,
      cancelled: String(row[4] ?? "").startsWith("[CANCELADA]"),
    };

    if (!APPLY) {
      toCreate++;
      console.log(`  row ${rowNumber}: would create — ${data.fechaVisita} ${data.horarioVisita} · ${data.nombreInstitucion}`);
      continue;
    }

    const created = await prisma.reservation.create({ data });
    await setRowEventId(rowNumber, created.id);
    updates.push({ rowNumber, id: created.id });
    toCreate++;
    if (toCreate % 25 === 0) console.log(`  imported ${toCreate} rows so far…`);
  }

  console.log("");
  console.log(APPLY ? "✅ Import complete." : "🔎 Dry run complete.");
  console.log(`   Created (or would create): ${toCreate}`);
  console.log(`   Skipped (already imported / bad data): ${skipped}`);
  if (!APPLY) console.log("\n   Re-run with --apply to actually write to DB and Sheet.");
}

main().catch((err) => {
  console.error("[import] fatal:", err);
  process.exit(1);
});
