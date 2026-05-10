import { cors } from "hono/cors";

const STATIC_ALLOWED = [
  "http://localhost:8000",
  "http://localhost:5173",
  "http://127.0.0.1:8000",
];

const EXTRA_ORIGINS = (process.env.CORS_EXTRA_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_HOSTS = (() => {
  const list = [...STATIC_ALLOWED, ...EXTRA_ORIGINS];
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL);
  return list;
})();

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return origin;
    if (ALLOWED_HOSTS.includes(origin)) return origin;
    // Allow any *.netlify.app preview URL — Netlify generates new URLs per deploy.
    if (/\.netlify\.app$/.test(origin)) return origin;
    if (/\.vercel\.app$/.test(origin)) return origin;
    if (/\.vibecode\.app$/.test(origin)) return origin;
    return null;
  },
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "x-admin-token"],
  credentials: true,
});
