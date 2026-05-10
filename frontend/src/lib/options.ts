import type { Lang } from "./i18n";

export const SECTORES = [
  "Educación básica",
  "Educación media",
  "Educación técnica",
  "Educación universitaria",
  "Adulto Mayor",
  "Organización sin fines de lucro - Proyección social",
  "Municipalidad",
  "Institución pública o gubernamental (no municipalidad)",
  "Salud",
  "Turismo",
  "Religiosa",
  "Otro",
];

export const RANGOS_EDADES = [
  "Niños: 8 a 11 años",
  "Prejóvenes: 12 a 14 años",
  "Jóvenes: 15 a 17 años",
  "Jóvenes: 18 años a 30 años",
  "Adultos: 31 años a 60 años",
  "Adultos mayores",
  "Grupo variado: personas de todas las edades",
];

export const PROPOSITOS = [
  "Turismo",
  "Conocer los principios de la religión bahá'í",
  "Conocer la arquitectura del Templo",
  "Reflexión, meditación y terapia",
  "Paisajismo y naturaleza",
  "Proyección social",
  "Recreación",
  "Otro",
];

export const IDIOMAS = ["Español", "Inglés", "Portugués", "Otro"];

/**
 * Translation map for dropdown option labels. Keys are the canonical
 * Spanish values (which are what get sent to the backend, written to
 * the sheet, and stored in the DB). Values are localized labels.
 */
export const OPTION_LABELS: Record<string, Record<Lang, string>> = {
  // Sectores
  "Educación básica": { es: "Educación básica", en: "Primary education", pt: "Educação básica" },
  "Educación media": { es: "Educación media", en: "Secondary education", pt: "Ensino médio" },
  "Educación técnica": { es: "Educación técnica", en: "Technical education", pt: "Educação técnica" },
  "Educación universitaria": { es: "Educación universitaria", en: "University education", pt: "Educação universitária" },
  "Adulto Mayor": { es: "Adulto Mayor", en: "Senior citizens", pt: "Idosos" },
  "Organización sin fines de lucro - Proyección social": {
    es: "Organización sin fines de lucro - Proyección social",
    en: "Non-profit — Community outreach",
    pt: "Organização sem fins lucrativos — Projeção social",
  },
  "Municipalidad": { es: "Municipalidad", en: "Municipality", pt: "Município" },
  "Institución pública o gubernamental (no municipalidad)": {
    es: "Institución pública o gubernamental (no municipalidad)",
    en: "Public or government institution (non-municipal)",
    pt: "Instituição pública ou governamental (não município)",
  },
  "Salud": { es: "Salud", en: "Health", pt: "Saúde" },
  "Religiosa": { es: "Religiosa", en: "Religious", pt: "Religiosa" },

  // Edades
  "Niños: 8 a 11 años": { es: "Niños: 8 a 11 años", en: "Children: 8 to 11 years", pt: "Crianças: 8 a 11 anos" },
  "Prejóvenes: 12 a 14 años": { es: "Prejóvenes: 12 a 14 años", en: "Pre-teens: 12 to 14 years", pt: "Pré-jovens: 12 a 14 anos" },
  "Jóvenes: 15 a 17 años": { es: "Jóvenes: 15 a 17 años", en: "Youth: 15 to 17 years", pt: "Jovens: 15 a 17 anos" },
  "Jóvenes: 18 años a 30 años": { es: "Jóvenes: 18 años a 30 años", en: "Young adults: 18 to 30 years", pt: "Jovens: 18 a 30 anos" },
  "Adultos: 31 años a 60 años": { es: "Adultos: 31 años a 60 años", en: "Adults: 31 to 60 years", pt: "Adultos: 31 a 60 anos" },
  "Adultos mayores": { es: "Adultos mayores", en: "Seniors", pt: "Idosos" },
  "Grupo variado: personas de todas las edades": {
    es: "Grupo variado: personas de todas las edades",
    en: "Mixed group: people of all ages",
    pt: "Grupo variado: pessoas de todas as idades",
  },

  // Propósitos
  "Turismo": { es: "Turismo", en: "Tourism", pt: "Turismo" },
  "Conocer los principios de la religión bahá'í": {
    es: "Conocer los principios de la religión bahá'í",
    en: "Learn about the principles of the Bahá'í Faith",
    pt: "Conhecer os princípios da religião bahá'í",
  },
  "Conocer la arquitectura del Templo": {
    es: "Conocer la arquitectura del Templo",
    en: "Learn about the Temple's architecture",
    pt: "Conhecer a arquitetura do Templo",
  },
  "Reflexión, meditación y terapia": {
    es: "Reflexión, meditación y terapia",
    en: "Reflection, meditation and therapy",
    pt: "Reflexão, meditação e terapia",
  },
  "Paisajismo y naturaleza": { es: "Paisajismo y naturaleza", en: "Landscape and nature", pt: "Paisagismo e natureza" },
  "Proyección social": { es: "Proyección social", en: "Community outreach", pt: "Projeção social" },
  "Recreación": { es: "Recreación", en: "Recreation", pt: "Recreação" },

  // Idiomas (the option labels themselves)
  "Español": { es: "Español", en: "Spanish", pt: "Espanhol" },
  "Inglés": { es: "Inglés", en: "English", pt: "Inglês" },
  "Portugués": { es: "Portugués", en: "Portuguese", pt: "Português" },

  // Region — only "Internacional" gets translated; Chilean region names are proper nouns.
  "Internacional": { es: "Internacional", en: "International", pt: "Internacional" },

  // Catch-all
  "Otro": { es: "Otro", en: "Other", pt: "Outro" },
};

export function tOption(value: string, lang: Lang): string {
  return OPTION_LABELS[value]?.[lang] ?? value;
}

export const COUNTRY_CODES = [
  { code: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "+591", name: "Bolivia", flag: "🇧🇴" },
  { code: "+55", name: "Brasil", flag: "🇧🇷" },
  { code: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "+506", name: "Costa Rica", flag: "🇨🇷" },
  { code: "+593", name: "Ecuador", flag: "🇪🇨" },
  { code: "+503", name: "El Salvador", flag: "🇸🇻" },
  { code: "+502", name: "Guatemala", flag: "🇬🇹" },
  { code: "+504", name: "Honduras", flag: "🇭🇳" },
  { code: "+52", name: "México", flag: "🇲🇽" },
  { code: "+505", name: "Nicaragua", flag: "🇳🇮" },
  { code: "+507", name: "Panamá", flag: "🇵🇦" },
  { code: "+595", name: "Paraguay", flag: "🇵🇾" },
  { code: "+51", name: "Perú", flag: "🇵🇪" },
  { code: "+1787", name: "Puerto Rico", flag: "🇵🇷" },
  { code: "+598", name: "Uruguay", flag: "🇺🇾" },
  { code: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "+1", name: "USA / Canadá", flag: "🇺🇸" },
  { code: "+34", name: "España", flag: "🇪🇸" },
];

export const ALL_SLOTS = ["10:00", "11:00", "12:00", "15:00", "16:00"] as const;

export function formatSlot(slot: string): string {
  // 24h "HH:MM" → "h:MM AM/PM"
  const [h, m] = slot.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}
