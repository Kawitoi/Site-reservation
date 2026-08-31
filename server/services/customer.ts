import type { Prisma } from "@/lib/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

/**
 * Reuses an existing Customer by phone number within the organization, or
 * creates a new one — spec section 24. Phone is the dedupe key because it
 * is required on every reservation path (manual and public); email is not.
 */
export async function findOrCreateCustomer(
  tx: TransactionClient,
  organizationId: string,
  input: { name: string; phone?: string | null; email?: string | null }
) {
  const phone = input.phone?.trim() || null;

  if (phone) {
    const existing = await tx.customer.findFirst({
      where: { organizationId, phone, anonymizedAt: null },
    });
    if (existing) {
      const needsUpdate =
        (input.email && input.email !== existing.email) || input.name !== existing.name;
      if (needsUpdate) {
        return tx.customer.update({
          where: { id: existing.id },
          data: {
            name: input.name || existing.name,
            email: input.email || existing.email,
          },
        });
      }
      return existing;
    }
  }

  return tx.customer.create({
    data: {
      organizationId,
      name: input.name,
      phone,
      email: input.email?.trim() || null,
    },
  });
}
