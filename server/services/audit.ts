import type { Prisma, AuditAction } from "@/lib/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

/**
 * Appends an AuditLog row (spec section 68). Always called from inside the
 * same transaction as the mutation it records, so the audit trail can never
 * silently drift from what actually happened.
 */
export async function recordAuditLog(
  tx: TransactionClient,
  input: {
    organizationId: string;
    userId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await tx.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
