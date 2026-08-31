import { z } from "zod";

export const availabilityQuerySchema = z.object({
  slug: z.string().min(1),
  partySize: z.coerce.number().int().min(1).max(100),
  date: z.iso.date(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const publicBookingSchema = z.object({
  slug: z.string().min(1),
  partySize: z.coerce.number().int().min(1).max(100),
  date: z.iso.date(),
  time: z.string().regex(timeRegex, "Heure invalide"),
  name: z.string().trim().min(1, "Le nom est requis").max(120),
  phone: z.string().trim().min(4, "Numéro de téléphone requis").max(30),
  email: z.email().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  // Honeypot field: real users never fill this. Bots that autofill every
  // input trip this and get silently rejected — see spec section 55.
  company: z.string().max(0).optional().or(z.literal("")),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
