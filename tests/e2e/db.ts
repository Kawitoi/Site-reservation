import { Client } from "pg";

// Playwright's default TS loader runs test files as CommonJS and can't
// load the generated Prisma client (which uses `import.meta`, ESM-only).
// E2E helpers use the `pg` driver directly with plain SQL instead — the
// column names below match schema.prisma exactly since no model there
// uses field-level `@map`, only table-level `@@map`.

if (!process.env.DATABASE_URL?.includes("tableflow_test")) {
  throw new Error("Refusing to run E2E tests: DATABASE_URL does not look like the test database.");
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
let connected = false;

async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!connected) {
    await client.connect();
    connected = true;
  }
  const result = await client.query(sql, params);
  return result.rows as T[];
}

export type LocationRow = {
  id: string;
  organizationId: string;
  publicSlug: string;
  timezone: string;
};

export async function getLocationByOrgName(namePrefix: string): Promise<LocationRow> {
  const rows = await query<LocationRow>(
    `SELECT rl.id, rl."organizationId", rl."publicSlug", rl.timezone
     FROM restaurant_location rl
     JOIN organization o ON o.id = rl."organizationId"
     WHERE o.name LIKE $1
     ORDER BY rl."createdAt" DESC
     LIMIT 1`,
    [`${namePrefix}%`]
  );
  if (rows.length === 0) throw new Error(`No location found for organization name prefix "${namePrefix}"`);
  return rows[0];
}

export async function createTable(locationId: string, name: string, seats: number): Promise<{ id: string }> {
  const rows = await query<{ id: string }>(
    `INSERT INTO "table" (id, "locationId", name, seats, "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, now())
     RETURNING id`,
    [locationId, name, seats]
  );
  return rows[0];
}

export async function getTableByName(locationId: string, name: string) {
  const rows = await query<{ id: string; x: number; y: number }>(
    `SELECT id, x, y FROM "table" WHERE "locationId" = $1 AND name = $2 LIMIT 1`,
    [locationId, name]
  );
  if (rows.length === 0) throw new Error(`Table "${name}" not found for location ${locationId}`);
  return rows[0];
}

export async function getTableById(id: string) {
  const rows = await query<{ id: string; x: number; y: number }>(`SELECT id, x, y FROM "table" WHERE id = $1`, [id]);
  if (rows.length === 0) throw new Error(`Table with id ${id} not found`);
  return rows[0];
}

export async function enablePublicBookingAllDay(locationId: string) {
  await query(
    `UPDATE restaurant_settings
     SET "dinnerOpensAt" = '00:00', "dinnerClosesAt" = '23:30', "minimumBookingNoticeMinutes" = 0
     WHERE "locationId" = $1`,
    [locationId]
  );
}

export async function countReservations(locationId: string): Promise<number> {
  const rows = await query<{ count: string }>(`SELECT count(*)::text FROM reservation WHERE "locationId" = $1`, [
    locationId,
  ]);
  return Number(rows[0].count);
}

export async function getFirstCustomerByOrg(organizationId: string): Promise<{ id: string }> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM customer WHERE "organizationId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
    [organizationId]
  );
  if (rows.length === 0) throw new Error(`No customer found for organization ${organizationId}`);
  return rows[0];
}

export async function cleanupOrganizationByName(namePrefix: string) {
  const orgs = await query<{ id: string }>(`SELECT id FROM organization WHERE name LIKE $1`, [`${namePrefix}%`]);
  for (const org of orgs) {
    const locations = await query<{ id: string }>(`SELECT id FROM restaurant_location WHERE "organizationId" = $1`, [
      org.id,
    ]);
    const locationIds = locations.map((l) => l.id);

    await query(`DELETE FROM reservation WHERE "organizationId" = $1`, [org.id]);
    await query(`DELETE FROM customer WHERE "organizationId" = $1`, [org.id]);
    if (locationIds.length > 0) {
      await query(`DELETE FROM "table" WHERE "locationId" = ANY($1::text[])`, [locationIds]);
      await query(`DELETE FROM special_closure WHERE "locationId" = ANY($1::text[])`, [locationIds]);
      await query(`DELETE FROM restaurant_settings WHERE "locationId" = ANY($1::text[])`, [locationIds]);
    }
    await query(`DELETE FROM restaurant_location WHERE "organizationId" = $1`, [org.id]);
    await query(`DELETE FROM subscription WHERE "organizationId" = $1`, [org.id]);
    await query(`DELETE FROM invitation WHERE "organizationId" = $1`, [org.id]);
    await query(`DELETE FROM audit_log WHERE "organizationId" = $1`, [org.id]);

    const members = await query<{ userId: string }>(`SELECT "userId" FROM member WHERE "organizationId" = $1`, [org.id]);
    await query(`DELETE FROM member WHERE "organizationId" = $1`, [org.id]);
    await query(`DELETE FROM organization WHERE id = $1`, [org.id]);
    for (const m of members) {
      await query(`DELETE FROM "user" WHERE id = $1`, [m.userId]);
    }
  }
}
