import { randomBytes, randomUUID } from "node:crypto";

const ADMIN_TOKENS = new Map<string, number>(); // token -> expiry ms
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

export function verifyAdminPassword(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return pw === expected;
}

export function issueAdminToken(): string {
  const tok = randomBytes(32).toString("hex");
  ADMIN_TOKENS.set(tok, Date.now() + TOKEN_TTL_MS);
  return tok;
}

export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const exp = ADMIN_TOKENS.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    ADMIN_TOKENS.delete(token);
    return false;
  }
  return true;
}

export function newReservationToken(): string {
  return randomUUID();
}
