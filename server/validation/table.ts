import { z } from "zod";

export const createTableSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().trim().min(1, "Le nom est requis").max(20),
  seats: z.coerce.number().int().min(1).max(50),
  shape: z.enum(["RECTANGLE", "ROUND"]).default("RECTANGLE"),
  x: z.coerce.number().default(40),
  y: z.coerce.number().default(40),
  width: z.coerce.number().min(20).max(400).default(80),
  height: z.coerce.number().min(20).max(400).default(80),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = createTableSchema.extend({
  id: z.string().min(1),
});

export type UpdateTableInput = z.infer<typeof updateTableSchema>;

export const moveTableSchema = z.object({
  id: z.string().min(1),
  locationId: z.string().min(1),
  x: z.coerce.number(),
  y: z.coerce.number(),
});
