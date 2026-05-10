// Cloudflare Turnstile verification. If CAPTCHA_SECRET_KEY is unset,
// captcha is bypassed (returns true).

export async function verifyCaptcha(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.CAPTCHA_SECRET_KEY;
  if (!secret) return true; // bypass
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch (err) {
    console.error("[captcha] verify failed:", err);
    return false;
  }
}
