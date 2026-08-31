import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const reservationSourceSchema = z.enum(["PHONE", "WEBSITE", "MANUAL", "OTHER"]);

export const createReservationSchema = z.object({
  locationId: z.string().min(1),
  date: z.iso.date(),
  time: z.string().regex(timeRegex, "Heure invalide (HH:mm)"),
  customerName: z.string().trim().min(1, "Le nom est requis").max(120),
  customerPhone: z.string().trim().max(30).optional().or(z.literal("")),
  customerEmail: z.email().max(160).optional().or(z.literal("")),
  partySize: z.coerce.number().int().min(1, "Au moins 1 personne").max(100),
  tableId: z.string().min(1).optional().or(z.literal("")),
  source: reservationSourceSchema.default("MANUAL"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const updateReservationSchema = createReservationSchema.extend({
  id: z.string().min(1),
});

export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;

export const listReservationsQuerySchema = z.object({
  locationId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(160).optional(),
  date: z.iso.date().optional(),
  source: reservationSourceSchema.optional(),
});
