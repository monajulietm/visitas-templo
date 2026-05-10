export type Lang = "es" | "en" | "pt";

export const dict: Record<Lang, Record<string, string>> = {
  es: {
    // Header
    headerTitle: "Templo Bahá'í de Sudamérica",
    headerSubtitle: "Solicitud de Reserva de Visita Grupal",
    languageLabel: "Idioma",

    // Form labels
    institution: "Nombre de la Institución",
    sector: "Sector de la Institución",
    sectorOther: "Especifique el sector",
    purposeOther: "Especifique el propósito",
    languageOther: "Especifique el idioma",
    visitDate: "Fecha tentativa de la visita",
    visitTime: "Horario tentativo de la visita",
    visitors: "Número de personas",
    visitorsHelp: "Entre 10 y 200 personas",
    ageRange: "Rango de edades de los visitantes",
    region: "Región",
    comuna: "Comuna",
    comunaOther: "Especifique la comuna",
    pickRegionFirst: "Elija una región primero",
    organizer: "Encargado de la Visita",
    purpose: "Propósito de la Visita",
    formLanguage: "Idioma de la visita",
    phone: "Teléfono de contacto",
    email: "Correo electrónico",
    requirements: "Requerimiento particular (opcional)",

    // Slot UI
    pickDateFirst: "Seleccione una fecha primero.",
    loadingSlots: "Consultando disponibilidad…",
    noSlots: "No hay horarios disponibles para esta fecha.",

    // Buttons
    submit: "Enviar solicitud",
    sending: "Enviando…",
    select: "Seleccione…",

    // Confirmation
    thanksTitle: "Gracias",
    thanksLine: "Pronto estaremos respondiendo su solicitud.",
    notesTitle: "NOTAS",
    note1: "En caso de estar ocupado el horario y la fecha que ha sugerido, procederemos a facilitar fechas disponibles cercanas a su solicitud.",
    note2: "Menores de edad deben estar acompañados por adultos.",
    manageMy: "Gestionar mi visita",

    // Manage page
    manageTitle: "Gestionar mi reserva",
    save: "Guardar cambios",
    cancel: "Cancelar mi visita",
    cancelConfirm: "¿Está seguro de que desea cancelar esta reserva? Esta acción no se puede deshacer.",
    cancelled: "Su reserva fue cancelada.",
    saved: "Cambios guardados correctamente.",
    notFound: "Reserva no encontrada.",
    loading: "Cargando…",
    backHome: "Volver al inicio",

    // Errors
    required: "Requerido",
    minVisitors: "Mínimo 10 personas.",
    maxVisitors: "Máximo 200 personas.",
    invalidEmail: "Correo electrónico inválido.",
    invalidPhone: "Teléfono inválido.",
  },

  en: {
    headerTitle: "Bahá'í Temple of South America",
    headerSubtitle: "Group Visit Reservation Request",
    languageLabel: "Language",

    institution: "Name of the Institution",
    sector: "Institution Sector",
    sectorOther: "Specify the sector",
    purposeOther: "Specify the purpose",
    languageOther: "Specify the language",
    visitDate: "Tentative visit date",
    visitTime: "Tentative visit time",
    visitors: "Number of visitors",
    visitorsHelp: "Between 10 and 200 people",
    ageRange: "Age range of visitors",
    region: "Region",
    comuna: "Comuna",
    comunaOther: "Specify the comuna",
    pickRegionFirst: "Pick a region first",
    organizer: "Visit Organizer",
    purpose: "Purpose of the Visit",
    formLanguage: "Visit language",
    phone: "Contact phone",
    email: "Email",
    requirements: "Special requirements (optional)",

    pickDateFirst: "Please pick a date first.",
    loadingSlots: "Checking availability…",
    noSlots: "No available times on this date.",

    submit: "Submit request",
    sending: "Sending…",
    select: "Select…",

    thanksTitle: "Thank you",
    thanksLine: "We will respond to your request shortly.",
    notesTitle: "NOTES",
    note1: "If the date or time you requested is unavailable, we'll suggest nearby alternatives.",
    note2: "Minors must be accompanied by adults.",
    manageMy: "Manage my visit",

    manageTitle: "Manage my reservation",
    save: "Save changes",
    cancel: "Cancel my visit",
    cancelConfirm: "Are you sure you want to cancel this reservation? This action cannot be undone.",
    cancelled: "Your reservation has been cancelled.",
    saved: "Changes saved successfully.",
    notFound: "Reservation not found.",
    loading: "Loading…",
    backHome: "Back to home",

    required: "Required",
    minVisitors: "Minimum 10 people.",
    maxVisitors: "Maximum 200 people.",
    invalidEmail: "Invalid email address.",
    invalidPhone: "Invalid phone number.",
  },

  pt: {
    headerTitle: "Templo Bahá'í da América do Sul",
    headerSubtitle: "Solicitação de Reserva para Visita em Grupo",
    languageLabel: "Idioma",

    institution: "Nome da Instituição",
    sector: "Setor da Instituição",
    sectorOther: "Especifique o setor",
    purposeOther: "Especifique o propósito",
    languageOther: "Especifique o idioma",
    visitDate: "Data prevista da visita",
    visitTime: "Horário previsto da visita",
    visitors: "Número de pessoas",
    visitorsHelp: "Entre 10 e 200 pessoas",
    ageRange: "Faixa etária dos visitantes",
    region: "Região",
    comuna: "Comuna",
    comunaOther: "Especifique a comuna",
    pickRegionFirst: "Escolha uma região primeiro",
    organizer: "Responsável pela visita",
    purpose: "Propósito da Visita",
    formLanguage: "Idioma da visita",
    phone: "Telefone de contato",
    email: "E-mail",
    requirements: "Requisito especial (opcional)",

    pickDateFirst: "Selecione uma data primeiro.",
    loadingSlots: "Consultando disponibilidade…",
    noSlots: "Não há horários disponíveis nesta data.",

    submit: "Enviar solicitação",
    sending: "Enviando…",
    select: "Selecione…",

    thanksTitle: "Obrigado",
    thanksLine: "Em breve responderemos à sua solicitação.",
    notesTitle: "NOTAS",
    note1: "Caso o horário ou a data sugeridos estejam ocupados, sugeriremos datas próximas disponíveis.",
    note2: "Menores de idade devem estar acompanhados de adultos.",
    manageMy: "Gerenciar minha visita",

    manageTitle: "Gerenciar minha reserva",
    save: "Salvar alterações",
    cancel: "Cancelar minha visita",
    cancelConfirm: "Tem certeza de que deseja cancelar esta reserva? Esta ação não pode ser desfeita.",
    cancelled: "Sua reserva foi cancelada.",
    saved: "Alterações salvas com sucesso.",
    notFound: "Reserva não encontrada.",
    loading: "Carregando…",
    backHome: "Voltar ao início",

    required: "Obrigatório",
    minVisitors: "Mínimo 10 pessoas.",
    maxVisitors: "Máximo 200 pessoas.",
    invalidEmail: "E-mail inválido.",
    invalidPhone: "Telefone inválido.",
  },
};

export function t(lang: Lang, key: string): string {
  return dict[lang][key] ?? key;
}
