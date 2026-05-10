// Sends one test confirmation email using the live Resend setup.
// Usage: bun run email:test you@yourdomain.com
import { sendConfirmationEmail } from "../src/lib/email.js";

const to = process.argv[2];
if (!to) {
  console.error("Usage: bun run email:test you@yourdomain.com");
  process.exit(1);
}

const fakeReservation = {
  id: "test-" + Date.now(),
  token: "test-token-" + Date.now(),
  nombreInstitucion: "Colegio de Prueba",
  sectorInstitucion: "Educación media",
  fechaVisita: "2026-05-22",
  horarioVisita: "11:00",
  nroPersonas: 35,
  rangoEdades: "Jóvenes: 15 a 17 años",
  region: "Metropolitana",
  comuna: "Providencia",
  encargadoVisita: "María Fernanda Soto",
  idiomaVisita: "Español",
  propositoVisita: "Conocer la arquitectura del Templo",
  telefonoContacto: "+56 9 8765 4321",
  correoElectronico: to,
  requerimientoParticular: null,
  cancelled: false,
  createdAt: new Date(),
} as any;

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8000";
const res = await sendConfirmationEmail(fakeReservation, frontendUrl);

if (!process.env.RESEND_API_KEY) {
  console.log("⚠️  RESEND_API_KEY not set — email was logged to console (stub mode), not actually sent.");
  process.exit(0);
}
if ((res as any)?.error) {
  console.error("❌ Send failed:", (res as any).error);
  process.exit(1);
}
console.log("✅ Test email sent to " + to + ". Check the inbox (and spam) within a minute.");
