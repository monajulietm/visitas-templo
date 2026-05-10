import { Hono } from "hono";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middleware/cors.js";
import { reservationRoutes } from "./routes/reservations.js";
import { manageRoutes } from "./routes/manage.js";
import { adminRoutes } from "./routes/admin.js";

const app = new Hono();

app.use("*", logger());
app.use("*", corsMiddleware);

app.get("/health", (c) =>
  c.json({ ok: true, service: "visitas-templo-backend", time: new Date().toISOString() })
);

app.route("/api/reservations", reservationRoutes);
app.route("/api/manage", manageRoutes);
app.route("/api/admin", adminRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error("[unhandled]", err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = Number(process.env.PORT ?? 3000);
console.log(`🛕  Templo Bahá'í backend listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
