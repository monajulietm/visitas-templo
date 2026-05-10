import { z } from "zod";

export const ReservationCreateSchema = z.object({
  nombreInstitucion: z.string().min(2).max(200),
  sectorInstitucion: z.string().min(2).max(120),
  fechaVisita: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horarioVisita: z.enum(["10:00", "11:00", "12:00", "15:00", "16:00"]),
  nroPersonas: z.number().int().min(10).max(200),
  rangoEdades: z.string().min(1),
  region: z.string().min(1),
  comuna: z.string().min(1),
  encargadoVisita: z.string().min(2).max(120),
  idiomaVisita: z.enum(["Español", "Inglés", "Portugués", "Otro"]),
  propositoVisita: z.string().min(1),
  telefonoContacto: z.string().min(4).max(40),
  correoElectronico: z.string().email(),
  requerimientoParticular: z.string().max(2000).optional().nullable(),
  // Anti-spam:
  website: z.string().optional(), // honeypot — must be empty
  captchaToken: z.string().optional(),
});

export type ReservationCreateInput = z.infer<typeof ReservationCreateSchema>;

export const ReservationUpdateSchema = z.object({
  fechaVisita: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  horarioVisita: z.enum(["10:00", "11:00", "12:00", "15:00", "16:00"]).optional(),
  nroPersonas: z.number().int().min(10).max(200).optional(),
});

export const BlockedDateSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional().nullable(),
  slots: z.array(z.string()).optional().nullable(), // empty/null => full day
});

export const AdminLoginSchema = z.object({
  password: z.string().min(1),
});
