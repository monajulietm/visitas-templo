// Chilean national holidays automatically blocked.
// MM-DD format. Some holidays are date-shifting; for simplicity we list
// the calendar dates that are typically observed each year.

const FIXED_HOLIDAYS_MMDD = [
  "01-01", // Año Nuevo
  "05-01", // Día del Trabajo
  "05-21", // Día de las Glorias Navales
  "06-29", // San Pedro y San Pablo
  "07-16", // Virgen del Carmen
  "08-15", // Asunción de la Virgen
  "09-18", // Independencia Nacional
  "09-19", // Glorias del Ejército
  "10-12", // Encuentro de Dos Mundos
  "11-01", // Día de Todos los Santos
  "12-08", // Inmaculada Concepción
  "12-25", // Navidad
];

export function isChileanHoliday(fecha: string): boolean {
  // fecha: YYYY-MM-DD
  const mmdd = fecha.slice(5);
  return FIXED_HOLIDAYS_MMDD.includes(mmdd);
}

export function chileanHolidaysForMonth(year: number, month: number): string[] {
  // month is 1-12
  const mm = String(month).padStart(2, "0");
  return FIXED_HOLIDAYS_MMDD
    .filter((h) => h.startsWith(mm))
    .map((h) => `${year}-${h}`);
}
