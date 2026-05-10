import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/cn";

type Props = {
  value?: string; // YYYY-MM-DD
  onChange: (fecha: string) => void;
  /** Minimum bookable date (YYYY-MM-DD), inclusive. */
  minDate: string;
  /** Locale for month/weekday labels. */
  locale?: "es" | "en" | "pt";
};

const MONTHS = {
  es: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  pt: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],
};
const WEEKDAYS = {
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
};

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function Calendar({ value, onChange, minDate, locale = "es" }: Props) {
  const today = new Date();
  const [view, setView] = useState(() => {
    const d = value ? new Date(value) : today;
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.monthAvailability(view.year, view.month)
      .then((res) => setBlocked(new Set(res.blockedDates)))
      .catch(() => setBlocked(new Set()))
      .finally(() => setLoading(false));
  }, [view.year, view.month]);

  const cells = useMemo(() => {
    const firstDow = new Date(view.year, view.month - 1, 1).getDay();
    const daysInMonth = new Date(view.year, view.month, 0).getDate();
    return Array.from({ length: firstDow + daysInMonth }, (_, i) => {
      if (i < firstDow) return null;
      return i - firstDow + 1;
    });
  }, [view]);

  function nav(delta: number) {
    let { year, month } = view;
    month += delta;
    if (month < 1) { month = 12; year--; }
    if (month > 12) { month = 1; year++; }
    setView({ year, month });
  }

  return (
    <div className="border border-templo-brown/15 rounded-lg bg-white p-2.5 max-w-[320px]">
      <div className="flex items-center justify-between mb-1.5">
        <button type="button" onClick={() => nav(-1)} className="p-0.5 rounded hover:bg-templo-gold/30">
          <ChevronLeft size={16} className="text-templo-brown" />
        </button>
        <div className="font-serif text-templo-brown text-sm">
          {MONTHS[locale][view.month - 1]} {view.year}
        </div>
        <button type="button" onClick={() => nav(1)} className="p-0.5 rounded hover:bg-templo-gold/30">
          <ChevronRight size={16} className="text-templo-brown" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-[10px] text-templo-brown/60 mb-0.5">
        {WEEKDAYS[locale].map((w) => (
          <div key={w} className="text-center py-0.5 uppercase tracking-wide">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const fecha = ymd(view.year, view.month, d);
          const dow = new Date(view.year, view.month - 1, d).getDay();
          const closedDay = dow === 0 || dow === 1;
          const beforeMin = fecha < minDate;
          const isBlocked = blocked.has(fecha);
          const disabled = closedDay || beforeMin || isBlocked || loading;
          const selected = value === fecha;
          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              onClick={() => onChange(fecha)}
              className={cn(
                "h-7 text-xs rounded transition flex items-center justify-center",
                selected
                  ? "bg-templo-gold text-templo-brown font-medium"
                  : disabled
                  ? "text-templo-brown/25 cursor-not-allowed"
                  : "text-templo-brown hover:bg-templo-gold/30"
              )}
              title={
                closedDay ? "Cerrado domingos y lunes"
                : isBlocked ? "Sin disponibilidad"
                : beforeMin ? "Mínimo 7 días de anticipación"
                : undefined
              }
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
