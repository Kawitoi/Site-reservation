import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestOrganization, createTestTable, cleanupOrganization, testDb } from "../helpers";
import { createReservation, updateReservation, deleteReservation, ReservationValidationError } from "@/server/services/reservation";

/**
 * Spec sections 6 and 96: an organization must never be able to read,
 * modify or delete another organization's data — even when it supplies a
 * technically-valid ID for a row it does not own.
 */
describe("multi-tenant isolation (integration)", () => {
  let orgA: Awaited<ReturnType<typeof createTestOrganization>>;
  let orgB: Awaited<ReturnType<typeof createTestOrganization>>;
  let tableA: string;
  let reservationA: string;

  beforeAll(async () => {
    orgA = await createTestOrganization({ name: "Tenant A" });
    orgB = await createTestOrganization({ name: "Tenant B" });
    const table = await createTestTable(orgA.location.id, 4);
    tableA = table.id;

    const reservation = await createReservation(
      {
        locationId: orgA.location.id,
        date: "2026-10-15",
        time: "19:00",
        customerName: "Tenant A Customer",
        customerPhone: "0611110000",
        partySize: 2,
        tableId: tableA,
        source: "MANUAL",
      },
      { organizationId: orgA.organization.id, userId: orgA.user.id }
    );
    reservationA = reservation.id;
  });

  afterAll(async () => {
    await cleanupOrganization(orgA.organization.id);
    await cleanupOrganization(orgB.organization.id);
  });

  it("org B cannot update org A's reservation even by guessing its id", async () => {
    await expect(
      updateReservation(
        {
          id: reservationA,
          locationId: orgA.location.id,
          date: "2026-10-15",
          time: "20:00",
          customerName: "Hijacked",
          customerPhone: "0000000000",
          partySize: 1,
          source: "MANUAL",
        },
        { organizationId: orgB.organization.id, userId: orgB.user.id }
      )
    ).rejects.toThrow(ReservationValidationError);
  });

  it("org B cannot delete org A's reservation", async () => {
    await expect(
      deleteReservation(reservationA, { organizationId: orgB.organization.id, userId: orgB.user.id })
    ).rejects.toThrow(ReservationValidationError);

    const stillThere = await testDb.reservation.findUnique({ where: { id: reservationA } });
    expect(stillThere).not.toBeNull();
  });

  it("org B cannot create a reservation against org A's location", async () => {
    await expect(
      createReservation(
        {
          locationId: orgA.location.id,
          date: "2026-10-16",
          time: "19:00",
          customerName: "Intruder",
          customerPhone: "0000000001",
          partySize: 2,
          source: "MANUAL",
        },
        { organizationId: orgB.organization.id, userId: orgB.user.id }
      )
    ).rejects.toThrow();
  });

  it("customer phone dedupe never crosses organizations", async () => {
    const rA = await createReservation(
      {
        locationId: orgA.location.id,
        date: "2026-10-17",
        time: "19:00",
        customerName: "Shared Number A",
        customerPhone: "0699998888",
        partySize: 2,
        source: "MANUAL",
      },
      { organizationId: orgA.organization.id, userId: orgA.user.id }
    );
    const rB = await createReservation(
      {
        locationId: orgB.location.id,
        date: "2026-10-17",
        time: "19:00",
        customerName: "Shared Number B",
        customerPhone: "0699998888",
        partySize: 2,
        source: "MANUAL",
      },
      { organizationId: orgB.organization.id, userId: orgB.user.id }
    );
    expect(rA.customerId).not.toBe(rB.customerId);
  });
});
