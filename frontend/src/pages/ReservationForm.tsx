import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { REGIONS, REGIONS_COMUNAS } from "../lib/regions";
import { SECTORES, RANGOS_EDADES, PROPOSITOS, IDIOMAS, COUNTRY_CODES, ALL_SLOTS, formatSlot, tOption } from "../lib/options";
import { t, type Lang } from "../lib/i18n";
import { Calendar } from "../components/Calendar";

const TEMPLE_LOGO = "/templobahai-logo.png";

const phoneRegex = /^\d[\d\s\-]{3,18}\d$/;

const schema = z.object({
  nombreInstitucion: z.string().min(2, "required"),
  sectorInstitucion: z.string().min(1, "required"),
  sectorOtro: z.string().optional(),
  fechaVisita: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "required"),
  horarioVisita: z.enum(["10:00", "11:00", "12:00", "15:00", "16:00"], { errorMap: () => ({ message: "required" }) }),
  nroPersonas: z.coerce.number().int().min(10, "minVisitors").max(200, "maxVisitors"),
  rangoEdades: z.string().min(1, "required"),
  region: z.string().min(1, "required"),
  comuna: z.string().min(1, "required"),
  encargadoVisita: z.string().min(2, "required"),
  idiomaVisita: z.enum(["Español", "Inglés", "Portugués", "Otro"]),
  idiomaOtro: z.string().optional(),
  propositoVisita: z.string().min(1, "required"),
  propositoOtro: z.string().optional(),
  countryCode: z.string().min(1),
  telefonoNumero: z.string().regex(phoneRegex, "invalidPhone"),
  correoElectronico: z.string().email("invalidEmail"),
  requerimientoParticular: z.string().optional(),
  website: z.string().optional(),
})
  .refine((d) => d.sectorInstitucion !== "Otro" || (d.sectorOtro?.trim().length ?? 0) > 0, {
    path: ["sectorOtro"], message: "required",
  })
  .refine((d) => d.propositoVisita !== "Otro" || (d.propositoOtro?.trim().length ?? 0) > 0, {
    path: ["propositoOtro"], message: "required",
  })
  .refine((d) => d.idiomaVisita !== "Otro" || (d.idiomaOtro?.trim().length ?? 0) > 0, {
    path: ["idiomaOtro"], message: "required",
  });

type FormValues = z.infer<typeof schema>;

const minDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
})();

export function ReservationForm() {
  const [lang, setLang] = useState<Lang>("es");
  const [submitted, setSubmitted] = useState<{ manageUrl: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { idiomaVisita: "Español", countryCode: "+56", website: "" },
    mode: "onBlur",
  });
  const { register, handleSubmit, watch, setValue, formState } = form;
  const errs = formState.errors;

  const region = watch("region");
  const sector = watch("sectorInstitucion");
  const fecha = watch("fechaVisita");
  const horario = watch("horarioVisita");
  const proposito = watch("propositoVisita");
  const idioma = watch("idiomaVisita");

  const comunas = useMemo(() => (region ? REGIONS_COMUNAS[region] ?? [] : []), [region]);

  const [slots, setSlots] = useState<{ slot: string; available: boolean; reason?: string }[] | null>(null);
  const [slotMessage, setSlotMessage] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!fecha) { setSlots(null); setSlotMessage(null); return; }
    let active = true;
    setLoadingSlots(true);
    api.availability(fecha)
      .then((res) => {
        if (!active) return;
        if (res.fullyBlocked) {
          setSlots([]);
          setSlotMessage(res.reason ?? t(lang, "noSlots"));
        } else {
          setSlots(res.slots);
          setSlotMessage(null);
        }
        setValue("horarioVisita", "" as any);
      })
      .catch(() => active && (setSlots(null), setSlotMessage(t(lang, "noSlots"))))
      .finally(() => active && setLoadingSlots(false));
    return () => { active = false; };
  }, [fecha, lang, setValue]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const sectorFinal = values.sectorInstitucion === "Otro" && values.sectorOtro
        ? values.sectorOtro : values.sectorInstitucion;
      const propositoFinal = values.propositoVisita === "Otro" && values.propositoOtro
        ? values.propositoOtro : values.propositoVisita;
      const idiomaFinal = values.idiomaVisita === "Otro" && values.idiomaOtro
        ? values.idiomaOtro : values.idiomaVisita;
      const telefonoContacto = `${values.countryCode} ${values.telefonoNumero}`.trim();
      const result = await api.createReservation({
        nombreInstitucion: values.nombreInstitucion,
        sectorInstitucion: sectorFinal,
        fechaVisita: values.fechaVisita,
        horarioVisita: values.horarioVisita,
        nroPersonas: values.nroPersonas,
        rangoEdades: values.rangoEdades,
        region: values.region,
        comuna: values.comuna,
        encargadoVisita: values.encargadoVisita,
        idiomaVisita: idiomaFinal,
        propositoVisita: propositoFinal,
        telefonoContacto,
        correoElectronico: values.correoElectronico,
        requerimientoParticular: values.requerimientoParticular || null,
        website: values.website || "",
      });
      setSubmitted({ manageUrl: result.manageUrl });
    } catch (err: any) {
      setServerError(err?.message || "Error.");
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-templo-cream flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-xl bg-white border border-templo-gold rounded-lg p-8 text-center"
        >
          <CheckCircle2 className="mx-auto text-templo-goldDeep mb-4" size={48} />
          <h1 className="font-serif text-3xl text-templo-brown mb-2">{t(lang, "thanksTitle")}</h1>
          <p className="text-templo-brown/80 mb-6">{t(lang, "thanksLine")}</p>
          <div className="text-left bg-templo-gold/30 border border-templo-gold rounded-md p-4 text-sm text-templo-brown">
            <div className="font-medium mb-2">{t(lang, "notesTitle")}</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t(lang, "note1")}</li>
              <li>{t(lang, "note2")}</li>
            </ul>
          </div>
          <a className="btn-primary mt-6" href={submitted.manageUrl}>{t(lang, "manageMy")}</a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-templo-cream">
      <div className="max-w-3xl mx-auto px-4 pt-1 pb-8">
        <header className="text-center mb-5">
          <img src={TEMPLE_LOGO} alt="Templo Bahá'í de Sudamérica" className="mx-auto block w-full max-w-[260px]" />
          <h1 className="font-serif text-2xl md:text-3xl text-templo-brown mt-3">{t(lang, "headerSubtitle")}</h1>
          <div className="inline-flex items-center gap-1 mt-3 bg-white border border-templo-brown/15 rounded-full p-1">
            {(["es", "en", "pt"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={
                  "px-3 py-1 text-xs rounded-full transition " +
                  (lang === l ? "bg-templo-gold text-templo-brown font-medium" : "text-templo-brown/60 hover:text-templo-brown")
                }
              >
                {l === "es" ? "Español" : l === "en" ? "English" : "Português"}
              </button>
            ))}
          </div>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-templo-brown/10 rounded-lg p-6 md:p-8 space-y-5"
        >
          <input
            type="text" tabIndex={-1} autoComplete="off" {...register("website")}
            className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden
          />

          <Field label={`1. ${t(lang, "institution")}`} error={errs.nombreInstitucion ? t(lang, errs.nombreInstitucion.message ?? "required") : undefined}>
            <input className="input" {...register("nombreInstitucion")} />
          </Field>

          <Field label={`2. ${t(lang, "sector")}`} error={errs.sectorInstitucion ? t(lang, errs.sectorInstitucion.message ?? "required") : undefined}>
            <select className="input" {...register("sectorInstitucion")}>
              <option value="">{t(lang, "select")}</option>
              {SECTORES.map((s) => <option key={s} value={s}>{tOption(s, lang)}</option>)}
            </select>
            {sector === "Otro" && (
              <>
                <input className="input mt-2" placeholder={t(lang, "sectorOther")} {...register("sectorOtro")} />
                {errs.sectorOtro && <p className="err">{t(lang, "required")}</p>}
              </>
            )}
          </Field>

          <Field label={`3. ${t(lang, "visitDate")}`} error={errs.fechaVisita ? t(lang, "required") : undefined}>
            <Calendar
              value={fecha}
              minDate={minDate}
              locale={lang}
              onChange={(f) => setValue("fechaVisita", f, { shouldValidate: true })}
            />
          </Field>

          <Field label={`4. ${t(lang, "visitTime")}`} error={errs.horarioVisita ? t(lang, "required") : undefined}>
            {!fecha ? (
              <p className="text-sm text-templo-brown/60">{t(lang, "pickDateFirst")}</p>
            ) : loadingSlots ? (
              <p className="text-sm text-templo-brown/70 flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} /> {t(lang, "loadingSlots")}
              </p>
            ) : slotMessage ? (
              <p className="text-sm text-red-700">{slotMessage}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ALL_SLOTS.map((slot) => {
                  const info = slots?.find((s) => s.slot === slot);
                  const exists = !!info;
                  const available = exists && info!.available;
                  const selected = horario === slot;
                  return (
                    <button
                      key={slot} type="button" disabled={!available}
                      onClick={() => setValue("horarioVisita", slot, { shouldValidate: true })}
                      className={
                        "rounded-md border px-3 py-2 text-sm transition " +
                        (selected
                          ? "bg-templo-gold border-templo-goldDeep text-templo-brown font-medium"
                          : available
                          ? "bg-white border-templo-brown/20 hover:border-templo-goldDeep text-templo-brown"
                          : "bg-templo-cream border-templo-brown/10 text-templo-brown/30 cursor-not-allowed")
                      }
                      title={info?.reason}
                    >
                      {formatSlot(slot)}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <Field
            label={`5. ${t(lang, "visitors")}`}
            help={t(lang, "visitorsHelp")}
            error={errs.nroPersonas ? t(lang, errs.nroPersonas.message ?? "required") : undefined}
          >
            <input type="number" min={10} max={200} className="input" {...register("nroPersonas")} />
          </Field>

          <Field label={`6. ${t(lang, "ageRange")}`} error={errs.rangoEdades ? t(lang, "required") : undefined}>
            <select className="input" {...register("rangoEdades")}>
              <option value="">{t(lang, "select")}</option>
              {RANGOS_EDADES.map((r) => <option key={r} value={r}>{tOption(r, lang)}</option>)}
            </select>
          </Field>

          <Field label={`7. ${t(lang, "region")}`} error={errs.region ? t(lang, "required") : undefined}>
            <select className="input" {...register("region")}>
              <option value="">{t(lang, "select")}</option>
              {REGIONS.map((r) => <option key={r} value={r}>{tOption(r, lang)}</option>)}
            </select>
          </Field>

          {region === "Internacional" ? (
            <Field label="8. País / Ciudad" error={errs.comuna ? t(lang, "required") : undefined}>
              <input className="input" placeholder="País / Ciudad" {...register("comuna")} />
            </Field>
          ) : (
            <Field label={`8. ${t(lang, "comuna")}`} error={errs.comuna ? t(lang, "required") : undefined}>
              <select className="input" {...register("comuna")} disabled={!region}>
                <option value="">{region ? t(lang, "select") : t(lang, "pickRegionFirst")}</option>
                {comunas.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          )}

          <Field label={`9. ${t(lang, "organizer")}`} error={errs.encargadoVisita ? t(lang, "required") : undefined}>
            <input className="input" {...register("encargadoVisita")} />
          </Field>

          <Field label={`10. ${t(lang, "purpose")}`} error={errs.propositoVisita ? t(lang, "required") : undefined}>
            <select className="input" {...register("propositoVisita")}>
              <option value="">{t(lang, "select")}</option>
              {PROPOSITOS.map((p) => <option key={p} value={p}>{tOption(p, lang)}</option>)}
            </select>
            {proposito === "Otro" && (
              <>
                <input className="input mt-2" placeholder={t(lang, "purposeOther")} {...register("propositoOtro")} />
                {errs.propositoOtro && <p className="err">{t(lang, "required")}</p>}
              </>
            )}
          </Field>

          <Field label={`11. ${t(lang, "formLanguage")}`}>
            <select className="input" {...register("idiomaVisita")}>
              {IDIOMAS.map((i) => <option key={i} value={i}>{tOption(i, lang)}</option>)}
            </select>
            {idioma === "Otro" && (
              <>
                <input className="input mt-2" placeholder={t(lang, "languageOther")} {...register("idiomaOtro")} />
                {errs.idiomaOtro && <p className="err">{t(lang, "required")}</p>}
              </>
            )}
          </Field>

          <Field label={`12. ${t(lang, "phone")}`} error={errs.telefonoNumero ? t(lang, errs.telefonoNumero.message ?? "invalidPhone") : undefined}>
            <div className="flex gap-2">
              <select className="input max-w-[150px]" {...register("countryCode")}>
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
              <input className="input" placeholder="9 8765 4321" {...register("telefonoNumero")} />
            </div>
          </Field>

          <Field label={`13. ${t(lang, "email")}`} error={errs.correoElectronico ? t(lang, errs.correoElectronico.message ?? "invalidEmail") : undefined}>
            <input type="email" className="input" {...register("correoElectronico")} />
          </Field>

          <Field label={`14. ${t(lang, "requirements")}`}>
            <textarea rows={3} className="input" {...register("requerimientoParticular")} />
          </Field>

          {serverError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{serverError}</p>
          )}

          <div className="pt-2">
            <button type="submit" disabled={formState.isSubmitting} className="btn-primary w-full md:w-auto">
              {formState.isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  {t(lang, "sending")}
                </>
              ) : t(lang, "submit")}
            </button>
          </div>
        </form>

        <footer className="text-center text-xs text-templo-brown/60 mt-6">
          Av. Diag. Las Torres 2000, Peñalolén · Santiago de Chile
        </footer>
      </div>
    </div>
  );
}

function Field({
  label, error, help, children,
}: { label: string; error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {help && !error && <p className="text-xs text-templo-brown/60 mt-1">{help}</p>}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
