import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestOrganization, createTestTable, cleanupOrganization, testDb } from "../helpers";
import {
  createReservation,
  updateReservation,
  deleteReservation,
  ReservationConflictError,
} from "@/server/services/reservation";

describe("reservation service (integration)", () => {
  let organizationId: string;
  let locationId: string;
  let userId: string;
  let tableId: string;

  beforeAll(async () => {
    const { organization, location, user } = await createTestOrganization();
    organizationId = organization.id;
    locationId = location.id;
    userId = user.id;
    const table = await createTestTable(locationId, 4);
    tableId = table.id;
  });

  afterAll(async () => {
    await cleanupOrganization(organizationId);
  });

  const ctx = () => ({ organizationId, userId });

  it("creates a reservation and reuses the customer on a second booking by phone (spec section 24)", async () => {
    const r1 = await createReservation(
      {
        locationId,
        date: "2026-10-01",
        time: "19:00",
        customerName: "Alice Dupont",
        customerPhone: "0611111111",
        partySize: 2,
        tableId,
        source: "MANUAL",
      },
      ctx()
    );
    expect(r1.customerId).not.toBeNull();

    const r2 = await createReservation(
      {
        locationId,
        date: "2026-10-02",
        time: "19:00",
        customerName: "Alice D.",
        customerPhone: "0611111111",
        partySize: 3,
        source: "MANUAL",
      },
      ctx()
    );
    expect(r2.customerId).toBe(r1.customerId);

    const customerCount = await testDb.customer.count({ where: { organizationId, phone: "0611111111" } });
    expect(customerCount).toBe(1);
  });

  it("rejects a real double-booking on the same table via the DB exclusion constraint (spec sections 36-38, 95)", async () => {
    await createReservation(
      {
        locationId,
        date: "2026-10-05",
        time: "19:00",
        customerName: "Bob",
        customerPhone: "0622222222",
        partySize: 2,
        tableId,
        source: "MANUAL",
      },
      ctx()
    );

    await expect(
      createReservation(
        {
          locationId,
          date: "2026-10-05",
          time: "20:00",
          customerName: "Charlie",
          customerPhone: "0633333333",
          partySize: 2,
          tableId,
          source: "MANUAL",
        },
        ctx()
      )
    ).rejects.toThrow(ReservationConflictError);
  });

  it("allows a back-to-back reservation once the previous one ends", async () => {
    const r1 = await createReservation(
      {
        locationId,
        date: "2026-10-06",
        time: "19:00",
        customerName: "Dana",
        customerPhone: "0644444444",
        partySize: 2,
        tableId,
        source: "MANUAL",
      },
      ctx()
    );
    // Default duration is 120 minutes, so this ends at 21:00.
    const r2 = await createReservation(
      {
        locationId,
        date: "2026-10-06",
        time: "21:00",
        customerName: "Eve",
        customerPhone: "0655555555",
        partySize: 2,
        tableId,
        source: "MANUAL",
      },
      ctx()
    );
    expect(r1.tableId).toBe(tableId);
    expect(r2.tableId).toBe(tableId);
  });

  it("update excludes the reservation being edited from its own overlap check", async () => {
    const reservation = await createReservation(
      {
        locationId,
        date: "2026-10-08",
        time: "19:00",
        customerName: "Frank",
        customerPhone: "0666666666",
        partySize: 2,
        tableId,
        source: "MANUAL",
      },
      ctx()
    );

    const updated = await updateReservation(
      {
        id: reservation.id,
        locationId,
        date: "2026-10-08",
        time: "19:30",
        customerName: "Frank",
        customerPhone: "0666666666",
        partySize: 3,
        tableId,
        source: "MANUAL",
      },
      ctx()
    );
    expect(updated.partySize).toBe(3);
    expect(updated.startAt.toISOString()).not.toBe(reservation.startAt.toISOString());
  });

  it("update still rejects a move onto a genuinely conflicting slot", async () => {
    const first = await createReservation(
      {
        locationId,
        date: "2026-10-09",
        time: "12:00",
        customerName: "Grace",
        customerPhone: "0677777777",
        partySize: 2,
        tableId,
        source: "MANUAL",
      },
      ctx()
    );
    const second = await createReservation(
      {
        locationId,
        date: "2026-10-09",
        time: "19:00",
        customerName: "Heidi",
        customerPhone: "0688888888",
        partySize: 2,
        tableId,
        source: "MANUAL",
      },
      ctx()
    );

    await expect(
      updateReservation(
        {
          id: second.id,
          locationId,
          date: "2026-10-09",
          time: "12:30",
          customerName: "Heidi",
          customerPhone: "0688888888",
          partySize: 2,
          tableId,
          source: "MANUAL",
        },
        ctx()
      )
    ).rejects.toThrow(ReservationConflictError);

    await deleteReservation(first.id, ctx());
    await deleteReservation(second.id, ctx());
  });

  it("delete removes the reservation", async () => {
    const reservation = await createReservation(
      {
        locationId,
        date: "2026-10-10",
        time: "19:00",
        customerName: "Ivan",
        customerPhone: "0699999999",
        partySize: 2,
        tableId,
        source: "MANUAL",
      },
      ctx()
    );
    await deleteReservation(reservation.id, ctx());
    const found = await testDb.reservation.findUnique({ where: { id: reservation.id } });
    expect(found).toBeNull();
  });
});
