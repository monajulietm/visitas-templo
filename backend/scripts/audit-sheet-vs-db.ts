// Compare the Sheet's "Registro de Grupos" tab against the DB.
// Reports rows in one but not the other so you can fix drift manually.
//
//   bun run sheet:audit

import { prisma } from "../src/lib/db.js";
import { readAllReservationRows } from "../src/lib/sheets.js";

async function main() {
  const [sheetRows, dbRows] = await Promise.all([
    readAllReservationRows(),
    prisma.reservation.findMany({ select: { id: true, fechaVisita: true, horarioVisita: true, nombreInstitucion: true, cancelled: true } }),
  ]);

  const sheetIds = new Set<string>();
  let sheetTotalWithId = 0;
  for (const { row } of sheetRows) {
    const id = (row[16] ?? "").trim();
    if (id) {
      sheetIds.add(id);
      sheetTotalWithId++;
    }
  }
  const dbIds = new Set(dbRows.map((r) => r.id));

  const onlyInSheet: { id: string; fecha: string; institucion: string }[] = [];
  for (const { row } of sheetRows) {
    const id = (row[16] ?? "").trim();
    if (!id) continue;
    if (!dbIds.has(id)) onlyInSheet.push({ id, fecha: row[1], institucion: row[7] });
  }

  const onlyInDb = dbRows.filter((r) => !sheetIds.has(r.id));

  console.log("📊 Audit summary");
  console.log(`   Sheet rows total:       ${sheetRows.length}`);
  console.log(`   Sheet rows with DB id:  ${sheetTotalWithId}`);
  console.log(`   DB rows total:          ${dbRows.length}`);
  console.log("");

  if (onlyInSheet.length === 0) {
    console.log("✅ Every Sheet row with an ID is present in the DB.");
  } else {
    console.log(`⚠️  ${onlyInSheet.length} Sheet row(s) reference DB IDs that don't exist:`);
    for (const x of onlyInSheet.slice(0, 20)) console.log(`   - ${x.id}  ${x.fecha}  ${x.institucion}`);
    if (onlyInSheet.length > 20) console.log(`   … and ${onlyInSheet.length - 20} more`);
  }

  console.log("");

  if (onlyInDb.length === 0) {
    console.log("✅ Every DB reservation is present in the Sheet.");
  } else {
    console.log(`⚠️  ${onlyInDb.length} DB row(s) not found in the Sheet:`);
    for (const r of onlyInDb.slice(0, 20)) {
      console.log(`   - ${r.id}  ${r.fechaVisita} ${r.horarioVisita}  ${r.nombreInstitucion}${r.cancelled ? " [cancelled]" : ""}`);
    }
    if (onlyInDb.length > 20) console.log(`   … and ${onlyInDb.length - 20} more`);
  }

  const sheetRowsWithoutId = sheetRows.length - sheetTotalWithId;
  if (sheetRowsWithoutId > 0) {
    console.log("");
    console.log(`ℹ️  ${sheetRowsWithoutId} Sheet row(s) have no DB id — these are pre-import historical rows.`);
    console.log(`    Run \`bun run sheet:import --apply\` to assign them DB ids.`);
  }
}

main().catch((err) => {
  console.error("[audit] fatal:", err);
  process.exit(1);
});
