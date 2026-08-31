import { z } from "zod";
import { ROLE_VALUES } from "@/lib/permissions";

export const inviteMemberSchema = z.object({
  email: z.email("Email invalide").max(160),
  role: z.enum(ROLE_VALUES),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(ROLE_VALUES),
});

export const removeMemberSchema = z.object({
  memberId: z.string().min(1),
});
