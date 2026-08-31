import { z } from "zod";

export const updateCustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Le nom est requis").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.email().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(160).optional(),
});
