// Verifies that the configured service account can reach the sheet
// and the configured tab exists. Run with: bun run sheets:test
import { pingSheet } from "../src/lib/sheets.js";

const result = await pingSheet();
if (result.ok) {
  console.log("✅ " + result.detail);
  process.exit(0);
} else {
  console.error("❌ " + result.detail);
  process.exit(1);
}
