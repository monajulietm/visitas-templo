// Verifies that the configured service account can reach the calendar.
// Run with: bun run calendar:test
import { pingCalendar } from "../src/lib/calendar.js";

const result = await pingCalendar();
if (result.ok) {
  console.log("✅ " + result.detail);
  process.exit(0);
} else {
  console.error("❌ " + result.detail);
  process.exit(1);
}
