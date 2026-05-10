import { useEffect, useMemo, useState } from "react";
import { Loader2, LogOut, Calendar, Users, Lock, Trash2, Plus, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import { ALL_SLOTS } from "../lib/options";
import { cn } from "../lib/cn";

type Tab = "dashboard" | "calendar" | "reservations" | "blocked";
const TOKEN_KEY = "templo-admin-token";

export function Admin() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!token) return <LoginScreen onLogin={(t) => { sessionStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  return (
    <div className="min-h-screen bg-templo-ink text-templo-deepgold/90">
      <header className="border-b border-templo-deepgold/20 px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-xl text-templo-deepgold">
          Templo Bahá'í de Sudamérica · Sistema de Reservas v1.0
        </h1>
        <button onClick={logout} className="text-sm flex items-center gap-2 hover:text-templo-deepgold">
          <LogOut size={14} /> Cerrar sesión
        </button>
      </header>
      <nav className="flex gap-1 border-b border-templo-deepgold/10 px-6 bg-templo-inkLight">
        {(["dashboard", "calendar", "reservations", "blocked"] as Tab[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-3 text-sm transition",
              tab === id
                ? "text-templo-deepgold border-b-2 border-templo-deepgold"
                : "text-templo-deepgold/60 hover:text-templo-deepgold/90"
            )}
          >
            {labelFor(id)}
          </button>
        ))}
      </nav>
      <main className="p-6 max-w-6xl mx-auto">
        {tab === "dashboard" && <Dashboard token={token} />}
        {tab === "calendar" && <CalendarView token={token} />}
        {tab === "reservations" && <ReservationsList token={token} />}
        {tab === "blocked" && <BlockedDates token={token} />}
      </main>
    </div>
  );
}

function labelFor(t: Tab) {
  return t === "dashboard" ? "Dashboard"
    : t === "calendar" ? "Calendario"
    : t === "reservations" ? "Reservaciones"
    : "Fechas Bloqueadas";
}

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const { token } = await api.adminLogin(pw);
      onLogin(token);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-templo-ink">
      <form onSubmit={submit} className="bg-templo-inkLight border border-templo-deepgold/20 rounded-lg p-8 w-full max-w-sm">
        <Lock className="mx-auto text-templo-deepgold mb-3" size={28} />
        <h1 className="font-serif text-2xl text-templo-deepgold text-center mb-6">Admin · Templo Bahá'í</h1>
        <input
          type="password"
          autoFocus
          placeholder="Contraseña"
          className="w-full bg-templo-ink border border-templo-deepgold/30 rounded-md px-3 py-2 text-templo-deepgold placeholder:text-templo-deepgold/40 focus:outline-none focus:border-templo-deepgold"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <p className="text-red-400 text-sm mt-2">{err}</p>}
        <button
          disabled={loading || !pw}
          className="w-full mt-4 bg-templo-deepgold text-templo-ink font-medium py-2 rounded-md disabled:opacity-50 hover:bg-templo-deepgold/90"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.adminStats(token).then(setStats).catch((e) => setError(e.message));
  }, [token]);
  if (error) return <Banner>{error}</Banner>;
  if (!stats) return <Spinner />;
  const cards = [
    { label: "Reservas activas", value: stats.active, icon: Calendar },
    { label: "Próximas", value: stats.upcoming, icon: Calendar },
    { label: "Visitantes (acumulado)", value: stats.totalVisitors, icon: Users },
    { label: "Canceladas", value: stats.cancelled, icon: Trash2 },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-templo-inkLight border border-templo-deepgold/10 rounded-lg p-5">
          <c.icon className="text-templo-deepgold mb-3" size={20} />
          <div className="text-3xl font-serif text-templo-deepgold">{c.value}</div>
          <div className="text-sm text-templo-deepgold/60 mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ token: _token }: { token: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [blocked, setBlocked] = useState<string[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.monthAvailability(year, month),
      api.adminReservations(_token),
    ])
      .then(([m, r]) => {
        setBlocked(m.blockedDates);
        setReservations(r.reservations);
      })
      .finally(() => setLoading(false));
  }, [_token, year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) =>
    i < firstDow ? null : i - firstDow + 1
  );

  function nav(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  }

  if (loading) return <Spinner />;

  const reservationsByDate = reservations.reduce<Record<string, any[]>>((acc, r) => {
    if (r.cancelled) return acc;
    (acc[r.fechaVisita] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => nav(-1)} className="text-templo-deepgold/80 hover:text-templo-deepgold">← Mes anterior</button>
        <h2 className="font-serif text-xl text-templo-deepgold">{monthName(month)} {year}</h2>
        <button onClick={() => nav(1)} className="text-templo-deepgold/80 hover:text-templo-deepgold">Mes siguiente →</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-templo-deepgold/60 mb-1">
        {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map((d) => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const fecha = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isBlocked = blocked.includes(fecha);
          const dayRes = reservationsByDate[fecha] || [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-[80px] rounded-md border p-1.5 text-xs",
                isBlocked
                  ? "border-templo-deepgold/10 bg-templo-ink/60 text-templo-deepgold/30"
                  : "border-templo-deepgold/10 bg-templo-inkLight"
              )}
            >
              <div className="text-templo-deepgold/80 font-medium">{d}</div>
              {dayRes.map((r) => (
                <div key={r.id} className="mt-1 truncate text-templo-deepgold/90">
                  • {r.horarioVisita} {r.nombreInstitucion}
                </div>
              ))}
              {isBlocked && dayRes.length === 0 && <div className="mt-1 text-templo-deepgold/40">—</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function monthName(m: number) {
  return ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][m-1];
}

function ReservationsList({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    const { reservations } = await api.adminReservations(token);
    setItems(reservations);
    setLoading(false);
  }
  useEffect(() => { load(); }, [token]);

  async function del(id: string) {
    if (!confirm("¿Eliminar esta reserva permanentemente?")) return;
    await api.adminDeleteReservation(token, id);
    load();
  }

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return items.filter((r) =>
      !q ||
      r.nombreInstitucion.toLowerCase().includes(q) ||
      r.encargadoVisita.toLowerCase().includes(q) ||
      r.correoElectronico.toLowerCase().includes(q) ||
      r.fechaVisita.includes(q)
    );
  }, [items, filter]);

  if (loading) return <Spinner />;

  return (
    <div>
      <input
        placeholder="Buscar institución, encargado, correo, fecha…"
        className="w-full bg-templo-inkLight border border-templo-deepgold/20 rounded-md px-3 py-2 text-sm text-templo-deepgold placeholder:text-templo-deepgold/40 mb-4"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-templo-deepgold/60 border-b border-templo-deepgold/10">
              <th className="py-2 pr-3">Fecha</th>
              <th className="py-2 pr-3">Hora</th>
              <th className="py-2 pr-3">Institución</th>
              <th className="py-2 pr-3">Encargado</th>
              <th className="py-2 pr-3"># Pers.</th>
              <th className="py-2 pr-3">Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-templo-deepgold/5">
                <td className="py-2 pr-3">{r.fechaVisita}</td>
                <td className="py-2 pr-3">{r.horarioVisita}</td>
                <td className="py-2 pr-3">{r.nombreInstitucion}</td>
                <td className="py-2 pr-3">{r.encargadoVisita}<div className="text-xs text-templo-deepgold/50">{r.correoElectronico}</div></td>
                <td className="py-2 pr-3">{r.nroPersonas}</td>
                <td className="py-2 pr-3">{r.cancelled ? <span className="text-red-400">Cancelada</span> : <span className="text-emerald-400">Activa</span>}</td>
                <td className="py-2 text-right">
                  <button onClick={() => del(r.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-templo-deepgold/50">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlockedDates({ token }: { token: string }) {
  const [list, setList] = useState<any[]>([]);
  const [fecha, setFecha] = useState("");
  const [reason, setReason] = useState("");
  const [pickedSlots, setPickedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { blockedDates } = await api.adminBlockedDates(token);
    setList(blockedDates);
    setLoading(false);
  }
  useEffect(() => { load(); }, [token]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api.adminBlockDate(token, { fecha, reason: reason || undefined, slots: pickedSlots });
    setFecha(""); setReason(""); setPickedSlots([]);
    load();
  }

  async function remove(f: string) {
    if (!confirm(`¿Desbloquear ${f}?`)) return;
    await api.adminUnblockDate(token, f);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <form onSubmit={add} className="bg-templo-inkLight border border-templo-deepgold/10 rounded-lg p-5 space-y-3">
        <h2 className="font-serif text-lg text-templo-deepgold flex items-center gap-2"><Plus size={16} /> Bloquear fecha</h2>
        <div>
          <label className="text-xs text-templo-deepgold/60">Fecha</label>
          <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="w-full bg-templo-ink border border-templo-deepgold/20 rounded-md px-3 py-2 text-templo-deepgold" />
        </div>
        <div>
          <label className="text-xs text-templo-deepgold/60">Motivo (opcional)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full bg-templo-ink border border-templo-deepgold/20 rounded-md px-3 py-2 text-templo-deepgold" />
        </div>
        <div>
          <label className="text-xs text-templo-deepgold/60 block mb-1">Horarios (vacío = todo el día)</label>
          <div className="grid grid-cols-5 gap-1.5">
            {ALL_SLOTS.map((s) => {
              const on = pickedSlots.includes(s);
              return (
                <button type="button" key={s}
                  onClick={() => setPickedSlots(on ? pickedSlots.filter((x) => x !== s) : [...pickedSlots, s])}
                  className={cn(
                    "py-1.5 text-xs rounded border transition",
                    on
                      ? "bg-templo-deepgold text-templo-ink border-templo-deepgold"
                      : "bg-templo-ink border-templo-deepgold/20 text-templo-deepgold/70 hover:border-templo-deepgold/50"
                  )}
                >{s}</button>
              );
            })}
          </div>
        </div>
        <button type="submit" className="bg-templo-deepgold text-templo-ink font-medium px-4 py-2 rounded-md hover:bg-templo-deepgold/90">
          Bloquear
        </button>
      </form>

      <div className="bg-templo-inkLight border border-templo-deepgold/10 rounded-lg p-5">
        <h2 className="font-serif text-lg text-templo-deepgold mb-3">Fechas bloqueadas</h2>
        {list.length === 0 ? (
          <p className="text-sm text-templo-deepgold/50">Sin fechas bloqueadas.</p>
        ) : (
          <ul className="divide-y divide-templo-deepgold/10">
            {list.map((b) => (
              <li key={b.id} className="py-2 flex items-center justify-between">
                <div className="text-sm">
                  <div className="text-templo-deepgold">{b.fecha}</div>
                  <div className="text-xs text-templo-deepgold/50">
                    {b.slots ? `Horarios: ${b.slots}` : "Día completo"}{b.reason ? ` · ${b.reason}` : ""}
                  </div>
                </div>
                <button onClick={() => remove(b.fecha)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-templo-deepgold/70" /></div>;
}
function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 rounded-md p-3 text-sm">
      <AlertTriangle size={16} /> {children}
    </div>
  );
}
