import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const locationInfoSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().trim().min(1, "Le nom est requis").max(120),
  email: z.email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(100).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).max(80),
  publicSlug: z
    .string()
    .trim()
    .min(3, "3 caractères minimum")
    .max(80)
    .regex(slugRegex, "Lettres minuscules, chiffres et tirets uniquement"),
});

export type LocationInfoInput = z.infer<typeof locationInfoSchema>;

export const reservationSettingsSchema = z.object({
  locationId: z.string().min(1),
  defaultReservationDurationMinutes: z.coerce.number().int().min(15).max(600),
  bookingIntervalMinutes: z.coerce.number().int().min(5).max(120),
  publicBookingEnabled: z.coerce.boolean(),
  notifyOnNewPublicBooking: z.coerce.boolean(),
  maxPartySize: z.coerce.number().int().min(1).max(100),
  minimumBookingNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  maxBookingDaysAhead: z.coerce.number().int().min(1).max(730),
});

export type ReservationSettingsInput = z.infer<typeof reservationSettingsSchema>;

const dayScheduleSchema = z.object({
  lunch: z.boolean(),
  dinner: z.boolean(),
});

export const weeklyScheduleSchema = z.object({
  "0": dayScheduleSchema,
  "1": dayScheduleSchema,
  "2": dayScheduleSchema,
  "3": dayScheduleSchema,
  "4": dayScheduleSchema,
  "5": dayScheduleSchema,
  "6": dayScheduleSchema,
});

export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>;

export const servicesSettingsSchema = z.object({
  locationId: z.string().min(1),
  lunchOpensAt: z.string().regex(timeRegex).optional().or(z.literal("")),
  lunchClosesAt: z.string().regex(timeRegex).optional().or(z.literal("")),
  dinnerOpensAt: z.string().regex(timeRegex).optional().or(z.literal("")),
  dinnerClosesAt: z.string().regex(timeRegex).optional().or(z.literal("")),
  weeklySchedule: weeklyScheduleSchema,
});

export type ServicesSettingsInput = z.infer<typeof servicesSettingsSchema>;

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(120),
  email: z.email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(100).default("France"),
  timezone: z.string().trim().min(1).default("Europe/Paris"),
  capacity: z.coerce.number().int().min(1).max(2000).optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
