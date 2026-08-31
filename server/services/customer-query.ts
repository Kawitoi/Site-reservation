import { db } from "@/lib/db";

export async function listCustomers(params: {
  organizationId: string;
  page: number;
  pageSize: number;
  search?: string;
}) {
  const { organizationId, page, pageSize, search } = params;

  const where = {
    organizationId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, customers] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { reservations: true } },
        reservations: { orderBy: { startAt: "desc" }, take: 1, select: { startAt: true } },
      },
    }),
  ]);

  return { customers, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCustomerDetail(id: string, organizationId: string) {
  const customer = await db.customer.findFirst({
    where: { id, organizationId },
  });
  if (!customer) return null;

  const reservations = await db.reservation.findMany({
    where: { customerId: id },
    orderBy: { startAt: "desc" },
    include: { location: { select: { name: true, timezone: true } }, table: { select: { name: true } } },
  });

  return { customer, reservations };
}
