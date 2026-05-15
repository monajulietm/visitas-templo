// Resend-backed transactional email. Spanish-only.
// If RESEND_API_KEY is not set, emails are logged to console (no-op).

import { Resend } from "resend";
import type { Reservation } from "@prisma/client";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "visitas@templobahai.cl";
const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Public URL for the temple logo. Email clients can only show images from
 * URLs they can reach over the public internet. Once you deploy the
 * frontend to a real domain, set FRONTEND_URL and the logo will be served
 * from your own /templobahai-logo.png file automatically. For local
 * testing (FRONTEND_URL=localhost:8000), email clients can't reach
 * localhost — set EMAIL_LOGO_URL to any public URL temporarily.
 */
const LOGO_URL =
  process.env.EMAIL_LOGO_URL ||
  (process.env.FRONTEND_URL && !/localhost|127\.0\.0\.1/.test(process.env.FRONTEND_URL)
    ? `${process.env.FRONTEND_URL.replace(/\/$/, "")}/templobahai-logo.png`
    : "https://registro.templo.bahai.cl/wp-content/uploads/2022/11/cropped-Templo-bahai-logotipo-sin-fondo.png");

const TEMPLE_WEBSITE = "https://www.bahai.cl/templobahai/visitar-el-templo-bahai";
const TEMPLE_EMAIL = "visitas@templobahai.cl";
const TEMPLE_WHATSAPP = "+56 988 460 588";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

function formatHora(slot: string): string {
  // "11:00" → "11:00 AM" / "15:00" → "3:00 PM"
  const [h, m] = slot.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

type EmailKind = "confirmation" | "update";

function buildHtml(r: Reservation, frontendUrl: string, kind: EmailKind): string {
  const manageUrl = `${frontendUrl}/manage/${r.token}`;
  const heading = kind === "confirmation"
    ? "Confirmación de su visita al Templo Bahá'í"
    : "Actualización de su visita al Templo Bahá'í";
  const intro = kind === "confirmation"
    ? "Hemos recibido su solicitud de visita y nos complace confirmar los siguientes detalles:"
    : "Su reserva ha sido actualizada con los siguientes detalles:";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${heading}</title>
<style>
  body { margin:0; padding:0; background:#fffdf6; font-family: 'Cormorant Garamond', 'Georgia', serif; color:#403923; }
  .wrap { max-width:620px; margin:0 auto; padding:32px 24px; }
  .card { background:#ffffff; border:1px solid #fbdb94; border-radius:8px; padding:32px; }
  h1 { color:#403923; font-weight:500; font-size:24px; margin:16px 0; text-align:center; }
  h2 { color:#403923; font-weight:500; font-size:18px; margin:24px 0 8px; border-bottom:1px solid #fbdb94; padding-bottom:6px; }
  p { line-height:1.6; font-size:16px; margin:8px 0; }
  table.details { width:100%; border-collapse:collapse; margin:8px 0 0; }
  table.details td { padding:8px 4px; font-size:15px; border-bottom:1px dotted #fbdb94; vertical-align:top; }
  table.details td.lbl { color:#403923; opacity:0.75; width:42%; }
  table.details td.val { font-weight:500; text-align:right; }
  .btn { display:inline-block; padding:10px 20px; margin:6px 6px 0 0; border-radius:4px; text-decoration:none; font-size:14px; font-weight:500; }
  .btn-primary { background:#fbdb94; color:#403923; }
  .btn-secondary { background:#fffdf6; color:#403923; border:1px solid #fbdb94; }
  .footer { margin-top:24px; font-size:13px; color:#403923; opacity:0.75; }
  a { color:#403923; }
  .logo { text-align:center; margin:0 0 8px; padding:0; }
  .logo img { height:auto; width:60%; max-width:280px; display:inline-block; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="logo"><img src="${LOGO_URL}" alt="Templo Bahá'í de Sudamérica" /></div>
    <h1>${heading}</h1>
    <p>Estimado/a <strong>${r.encargadoVisita}</strong>,</p>
    <p>${intro}</p>

    <h2>Detalles de la visita</h2>
    <table class="details" cellspacing="0" cellpadding="0">
      <tr><td class="lbl">Institución</td><td class="val">${r.nombreInstitucion}</td></tr>
      <tr><td class="lbl">Fecha</td><td class="val">${formatFecha(r.fechaVisita)}</td></tr>
      <tr><td class="lbl">Horario</td><td class="val">${formatHora(r.horarioVisita)}</td></tr>
      <tr><td class="lbl">Número de personas</td><td class="val">${r.nroPersonas}</td></tr>
      <tr><td class="lbl">Idioma preferido</td><td class="val">${r.idiomaVisita}</td></tr>
    </table>

    <h2>Cómo llegar</h2>
    <p>El Templo se encuentra en Av. Diag. Las Torres 2000, Peñalolén. Desde el ingreso vehicular hay un sendero peatonal de aproximadamente 1,6 km hasta la Casa de Adoración. También se puede acceder en bus público y existen rampas para personas con movilidad reducida.</p>

    <h2>Durante la visita</h2>
    <p>Al llegar, por favor diríjase a la recepción para registrar su grupo. Tras la recepción, podrán explorar libremente el Templo y sus jardines en silencio y respeto.</p>

    <h2>Vestimenta</h2>
    <p>Se sugiere vestimenta sobria y respetuosa, acorde a un espacio de oración y meditación.</p>

    <h2>Gestionar su reserva</h2>
    <p>
      <a class="btn btn-primary" href="${manageUrl}">Editar mi visita</a>
      <a class="btn btn-secondary" href="${manageUrl}">Cancelar mi visita</a>
    </p>

    <div class="footer">
      <p><strong>Contacto</strong><br/>
      Sitio web: <a href="${TEMPLE_WEBSITE}">${TEMPLE_WEBSITE}</a><br/>
      Correo: <a href="mailto:${TEMPLE_EMAIL}">${TEMPLE_EMAIL}</a><br/>
      WhatsApp: ${TEMPLE_WHATSAPP}</p>
      <p>Templo Bahá'í de Sudamérica<br/>Av. Diag. Las Torres 2000, Peñalolén, Santiago, Chile</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[email:stub] To: ${to} | Subject: ${subject}`);
    return { stubbed: true };
  }
  try {
    const replyTo = process.env.EMAIL_REPLY_TO || undefined;
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    return result;
  } catch (err) {
    console.error("[email] send failed:", err);
    return { error: err };
  }
}

export async function sendConfirmationEmail(r: Reservation, frontendUrl: string) {
  const html = buildHtml(r, frontendUrl, "confirmation");
  return send(r.correoElectronico, "Confirmación de su visita al Templo Bahá'í", html);
}

export async function sendUpdateEmail(r: Reservation, frontendUrl: string) {
  const html = buildHtml(r, frontendUrl, "update");
  return send(r.correoElectronico, "Actualización de su visita al Templo Bahá'í", html);
}

/** Plain-prose notification to staff (visitas@bahai.cl + admin) when a new
 * reservation comes in. Used in place of the Calendar invite email since
 * service accounts can't send those. */
export async function sendStaffNotificationEmail(r: Reservation): Promise<void> {
  const staffEmails = (process.env.STAFF_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (staffEmails.length === 0) return;
  if (!resend) {
    console.log(`[email:stub] would notify staff ${staffEmails.join(", ")} of reservation ${r.id}`);
    return;
  }
  const subject = `Nueva reserva: ${r.nombreInstitucion} — ${r.fechaVisita} ${r.horarioVisita}`;
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#fffdf6;font-family:'Cormorant Garamond',Georgia,serif;color:#403923;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #fbdb94;border-radius:8px;padding:24px;">
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:500;color:#403923;">Nueva solicitud de visita</h1>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;width:42%;">Institución</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.nombreInstitucion}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Fecha</td><td style="padding:6px 0;text-align:right;font-weight:500;">${formatFecha(r.fechaVisita)}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Horario</td><td style="padding:6px 0;text-align:right;font-weight:500;">${formatHora(r.horarioVisita)}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Personas</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.nroPersonas}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Encargado</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.encargadoVisita}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Sector</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.sectorInstitucion}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Idioma</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.idiomaVisita}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Propósito</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.propositoVisita}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Comuna</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.region} / ${r.comuna}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Teléfono</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.telefonoContacto}</td></tr>
      <tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Correo</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.correoElectronico}</td></tr>
      ${r.requerimientoParticular ? `<tr><td style="padding:6px 0;color:#403923;opacity:0.7;">Requerimientos</td><td style="padding:6px 0;text-align:right;font-weight:500;">${r.requerimientoParticular}</td></tr>` : ""}
    </table>
    <p style="margin:18px 0 0;font-size:13px;color:#403923;opacity:0.75;">El evento también se agregó al calendario de visitas@bahai.cl.</p>
  </div>
</body></html>`;
  try {
    const replyTo = process.env.EMAIL_REPLY_TO || undefined;
    await resend.emails.send({
      from: fromEmail,
      to: staffEmails,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
  } catch (err) {
    console.error("[email] staff notify failed:", err);
  }
}
