import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const testDb = new PrismaClient({ adapter });

let counter = 0;
function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function createTestOrganization(overrides?: { name?: string }) {
  const name = overrides?.name ?? unique("Test Org");
  const organization = await testDb.organization.create({
    data: { name, slug: unique("test-org") },
  });
  const location = await testDb.restaurantLocation.create({
    data: {
      organizationId: organization.id,
      name: unique("Test Restaurant"),
      timezone: "Europe/Paris",
      publicSlug: unique("test-restaurant"),
      settings: { create: {} },
    },
  });
  const user = await testDb.user.create({
    data: { name: "Test User", email: `${unique("test-user")}@test.local` },
  });
  await testDb.member.create({
    data: { organizationId: organization.id, userId: user.id, role: "owner" },
  });

  return { organization, location, user };
}

export async function createTestTable(locationId: string, seats: number, name = "T1") {
  return testDb.table.create({ data: { locationId, name, seats } });
}

export async function cleanupOrganization(organizationId: string) {
  await testDb.reservation.deleteMany({ where: { organizationId } });
  await testDb.customer.deleteMany({ where: { organizationId } });
  const locations = await testDb.restaurantLocation.findMany({ where: { organizationId }, select: { id: true } });
  const locationIds = locations.map((l) => l.id);
  await testDb.table.deleteMany({ where: { locationId: { in: locationIds } } });
  await testDb.specialClosure.deleteMany({ where: { locationId: { in: locationIds } } });
  await testDb.restaurantSettings.deleteMany({ where: { locationId: { in: locationIds } } });
  await testDb.restaurantLocation.deleteMany({ where: { organizationId } });
  await testDb.subscription.deleteMany({ where: { organizationId } });
  const members = await testDb.member.findMany({ where: { organizationId }, select: { userId: true } });
  await testDb.member.deleteMany({ where: { organizationId } });
  await testDb.invitation.deleteMany({ where: { organizationId } });
  await testDb.auditLog.deleteMany({ where: { organizationId } });
  await testDb.organization.delete({ where: { id: organizationId } });
  for (const m of members) {
    await testDb.user.deleteMany({ where: { id: m.userId } });
  }
}
