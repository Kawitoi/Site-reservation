import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";

/**
 * Development seed data (spec section 63). Never run against production —
 * spec section 132 explicitly forbids auto-seeding demo data there.
 *
 * The demo User/Account rows are constructed by hand rather than through
 * better-auth's HTTP API (which needs a live request context this
 * standalone script doesn't have), but still use better-auth's own
 * `hashPassword` so credentials are stored exactly as the real signup flow
 * would store them — see spec section 7 ("ne pas implémenter toi-même...
 * la cryptographie").
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@tableflow.local";
const DEMO_PASSWORD = "demo12345";
// Matches better-auth's own local credential-account issuer format
// (`createLocalAccountIssuer("credential")` in @better-auth/core).
const CREDENTIAL_ISSUER = "local:credential";

async function main() {
  console.log("Seeding TableFlow demo data...");

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo TableFlow",
      emailVerified: true,
    },
  });

  const existingAccount = await db.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (!existingAccount) {
    await db.account.create({
      data: {
        userId: user.id,
        providerId: "credential",
        issuer: CREDENTIAL_ISSUER,
        accountId: user.id,
        password: passwordHash,
      },
    });
  }

  const organization = await db.organization.upsert({
    where: { slug: "tableflow-demo" },
    update: {},
    create: { name: "TableFlow Demo", slug: "tableflow-demo" },
  });

  await db.member.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: {},
    create: { organizationId: organization.id, userId: user.id, role: "owner" },
  });

  const location = await db.restaurantLocation.upsert({
    where: { publicSlug: "le-bistrot-central" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Le Bistrot Central",
      email: DEMO_EMAIL,
      phone: "01 23 45 67 89",
      address: "12 rue de la Paix",
      city: "Paris",
      postalCode: "75002",
      country: "France",
      timezone: "Europe/Paris",
      publicSlug: "le-bistrot-central",
    },
  });

  await db.restaurantSettings.upsert({
    where: { locationId: location.id },
    update: {},
    create: {
      locationId: location.id,
      lunchOpensAt: "12:00",
      lunchClosesAt: "14:30",
      dinnerOpensAt: "19:00",
      dinnerClosesAt: "22:30",
    },
  });

  const tableSpecs: { name: string; seats: number; x: number; y: number }[] = [
    { name: "T1", seats: 2, x: 40, y: 40 },
    { name: "T2", seats: 2, x: 160, y: 40 },
    { name: "T3", seats: 4, x: 40, y: 160 },
    { name: "T4", seats: 4, x: 160, y: 160 },
    { name: "T5", seats: 6, x: 40, y: 300 },
    { name: "T6", seats: 8, x: 220, y: 300 },
  ];

  const tables: Record<string, { id: string; seats: number }> = {};
  for (const spec of tableSpecs) {
    const existing = await db.table.findFirst({ where: { locationId: location.id, name: spec.name } });
    const table =
      existing ??
      (await db.table.create({
        data: { locationId: location.id, name: spec.name, seats: spec.seats, x: spec.x, y: spec.y },
      }));
    tables[spec.name] = { id: table.id, seats: table.seats };
  }

  const existingReservationCount = await db.reservation.count({ where: { locationId: location.id } });
  if (existingReservationCount === 0) {
    const today = new Date();
    const atLocalTime = (hour: number, minute: number) => {
      const d = new Date(today);
      d.setUTCHours(hour - 2, minute, 0, 0); // approximate Europe/Paris (UTC+2 in summer) offset for seed data only
      return d;
    };

    const demoReservations = [
      { table: "T1", customerName: "Sophie Martin", phone: "0611111111", partySize: 2, start: atLocalTime(12, 30) },
      { table: "T3", customerName: "Julien Petit", phone: "0622222222", partySize: 4, start: atLocalTime(12, 45) },
      { table: "T2", customerName: "Claire Dubois", phone: "0633333333", partySize: 2, start: atLocalTime(19, 0) },
      { table: "T4", customerName: "Marc Bernard", phone: "0644444444", partySize: 4, start: atLocalTime(19, 30) },
      { table: "T5", customerName: "Isabelle Moreau", phone: "0655555555", partySize: 6, start: atLocalTime(20, 0) },
      { table: "T6", customerName: "Groupe Anniversaire", phone: "0666666666", partySize: 8, start: atLocalTime(20, 30) },
    ];

    for (const r of demoReservations) {
      const customer = await db.customer.create({
        data: { organizationId: organization.id, name: r.customerName, phone: r.phone },
      });
      const endAt = new Date(r.start.getTime() + 120 * 60_000);
      await db.reservation.create({
        data: {
          organizationId: organization.id,
          locationId: location.id,
          tableId: tables[r.table].id,
          customerId: customer.id,
          customerName: r.customerName,
          customerPhone: r.phone,
          partySize: r.partySize,
          startAt: r.start,
          endAt,
          source: "MANUAL",
        },
      });
    }
    console.log(`Created ${demoReservations.length} demo reservations.`);
  }

  console.log("Seed complete.");
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
