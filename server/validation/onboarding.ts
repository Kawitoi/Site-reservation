import { z } from "zod";

export const signupAccountSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(120),
  email: z.email("Email invalide").max(160),
  password: z.string().min(8, "8 caractères minimum").max(128),
});

export type SignupAccountInput = z.infer<typeof signupAccountSchema>;

export const signupRestaurantSchema = z.object({
  restaurantName: z.string().trim().min(1, "Le nom du restaurant est requis").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(2000).optional(),
});

export type SignupRestaurantInput = z.infer<typeof signupRestaurantSchema>;

export const onboardingSchema = signupAccountSchema.merge(signupRestaurantSchema);
export type OnboardingInput = z.infer<typeof onboardingSchema>;
