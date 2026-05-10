import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../lib/api";
import { ALL_SLOTS, formatSlot } from "../lib/options";
import { t, type Lang } from "../lib/i18n";
import { Calendar } from "../components/Calendar";

const TEMPLE_LOGO = "/templobahai-logo.png";

export function ManageReservation() {
  const { token } = useParams();
  const [lang, setLang] = useState<Lang>("es");
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit fields
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [personas, setPersonas] = useState<number>(0);
  const [slots, setSlots] = useState<{ slot: string; available: boolean }[] | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const minDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  useEffect(() => {
    if (!token) return;
    api.getReservation(token)
      .then(({ reservation }) => {
        setReservation(reservation);
        setFecha(reservation.fechaVisita);
        setHorario(reservation.horarioVisita);
        setPersonas(reservation.nroPersonas);
        if (reservation.cancelled) setCancelled(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!fecha) return;
    api.availability(fecha)
      .then((res) => setSlots(res.fullyBlocked ? [] : res.slots))
      .catch(() => setSlots(null));
  }, [fecha]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      const { reservation: updated } = await api.updateReservation(token, {
        fechaVisita: fecha,
        horarioVisita: horario,
        nroPersonas: personas,
      });
      setReservation(updated);
      setSavedMsg(t(lang, "saved"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!token) return;
    setSaving(true);
    try {
      await api.cancelReservation(token);
      setCancelled(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
      setConfirmingCancel(false);
    }
  }

  if (loading) {
    return (
      <Page>
        <Centered><Loader2 className="animate-spin text-templo-brown/60" /></Centered>
      </Page>
    );
  }

  if (error && !reservation) {
    return (
      <Page>
        <Centered>
          <XCircle className="text-templo-brown/60 mb-3" size={42} />
          <h1 className="font-serif text-2xl text-templo-brown mb-2">{t(lang, "notFound")}</h1>
          <Link to="/" className="btn-ghost mt-4">{t(lang, "backHome")}</Link>
        </Centered>
      </Page>
    );
  }

  if (cancelled) {
    return (
      <Page>
        <Centered>
          <div className="bg-white border border-templo-gold rounded-lg p-8 text-center max-w-md">
            <XCircle className="mx-auto text-templo-brown/70 mb-3" size={42} />
            <h1 className="font-serif text-2xl text-templo-brown mb-2">{t(lang, "cancelled")}</h1>
            <Link to="/" className="btn-ghost mt-4 inline-flex">{t(lang, "backHome")}</Link>
          </div>
        </Centered>
      </Page>
    );
  }

  return (
    <Page>
      <div className="max-w-xl mx-auto px-4 pt-1 pb-8">
        <header className="text-center mb-5">
          <img src={TEMPLE_LOGO} alt="Templo Bahá'í de Sudamérica" className="mx-auto block w-full max-w-[260px]" />
          <h1 className="font-serif text-2xl md:text-3xl text-templo-brown mt-3">{t(lang, "manageTitle")}</h1>
          <div className="inline-flex items-center gap-1 mt-3 bg-white border border-templo-brown/15 rounded-full p-1">
            {(["es", "en", "pt"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={
                  "px-3 py-1 text-xs rounded-full transition " +
                  (lang === l
                    ? "bg-templo-gold text-templo-brown font-medium"
                    : "text-templo-brown/60 hover:text-templo-brown")
                }
              >
                {l === "es" ? "Español" : l === "en" ? "English" : "Português"}
              </button>
            ))}
          </div>
        </header>

        <div className="bg-white border border-templo-brown/10 rounded-lg p-6 md:p-8 space-y-5">
          <ReadOnly label={t(lang, "institution")} value={reservation.nombreInstitucion} />

          <Field label={t(lang, "date")}>
            <Calendar
              value={fecha}
              minDate={minDate}
              locale={lang}
              onChange={setFecha}
            />
          </Field>

          <Field label={t(lang, "time")}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ALL_SLOTS.map((s) => {
                const info = slots?.find((x) => x.slot === s);
                const exists = !!info;
                const isCurrent = s === reservation.horarioVisita && fecha === reservation.fechaVisita;
                const enabled = exists && (info!.available || isCurrent);
                const selected = horario === s;
                return (
                  <button
                    type="button"
                    key={s}
                    disabled={!enabled}
                    onClick={() => setHorario(s)}
                    className={
                      "rounded-md border px-3 py-2 text-sm transition " +
                      (selected
                        ? "bg-templo-gold border-templo-goldDeep text-templo-brown font-medium"
                        : enabled
                        ? "bg-white border-templo-brown/20 hover:border-templo-goldDeep text-templo-brown"
                        : "bg-templo-cream border-templo-brown/10 text-templo-brown/30 cursor-not-allowed")
                    }
                  >
                    {formatSlot(s)}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={t(lang, "visitors")}>
            <input
              type="number"
              min={10}
              max={200}
              className="input"
              value={personas}
              onChange={(e) => setPersonas(Number(e.target.value))}
            />
          </Field>

          {savedMsg && (
            <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
              <CheckCircle2 size={16} /> {savedMsg}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{error}</p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              {t(lang, "save")}
            </button>

            {confirmingCancel ? (
              <div className="flex flex-col gap-2 text-sm w-full bg-templo-cream border border-templo-gold rounded-md p-4">
                <p className="text-templo-brown">{t(lang, "cancelConfirm")}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="btn bg-red-700 text-white hover:bg-red-800"
                  >
                    {saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                    {t(lang, "cancel")}
                  </button>
                  <button onClick={() => setConfirmingCancel(false)} className="btn-ghost">
                    {t(lang, "backHome")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingCancel(true)}
                className="btn border border-red-300 text-red-700 hover:bg-red-50"
              >
                {t(lang, "cancel")}
              </button>
            )}
          </div>
        </div>

        <footer className="text-center text-xs text-templo-brown/55 mt-6">
          Av. Diag. Las Torres 2000, Peñalolén · Santiago de Chile
        </footer>
      </div>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-templo-cream">{children}</div>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center px-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="input bg-templo-cream">{value}</div>
    </div>
  );
}
