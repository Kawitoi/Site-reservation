import { describe, it, expect } from "vitest";
import { createReservationSchema } from "@/server/validation/reservation";
import { publicBookingSchema } from "@/server/validation/public-booking";
import { inviteMemberSchema } from "@/server/validation/member";
import { createTableSchema } from "@/server/validation/table";

describe("createReservationSchema", () => {
  const valid = {
    locationId: "loc_1",
    date: "2026-09-15",
    time: "19:30",
    customerName: "Jean Dupont",
    partySize: 4,
    source: "MANUAL",
  };

  it("accepts a well-formed reservation", () => {
    expect(createReservationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty customer name", () => {
    const result = createReservationSchema.safeParse({ ...valid, customerName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid time format", () => {
    const result = createReservationSchema.safeParse({ ...valid, time: "7:30pm" });
    expect(result.success).toBe(false);
  });

  it("rejects a party size of zero", () => {
    const result = createReservationSchema.safeParse({ ...valid, partySize: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email when provided", () => {
    const result = createReservationSchema.safeParse({ ...valid, customerEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("publicBookingSchema (spec section 55)", () => {
  const valid = {
    slug: "le-bistrot-central",
    partySize: 2,
    date: "2026-09-15",
    time: "19:00",
    name: "Alice",
    phone: "0611223344",
  };

  it("accepts a well-formed public booking", () => {
    expect(publicBookingSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a phone number", () => {
    const result = publicBookingSchema.safeParse({ ...valid, phone: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a filled honeypot field's oversized content the same as any other field (defense in depth)", () => {
    const result = publicBookingSchema.safeParse({ ...valid, company: "I am a bot filling every field" });
    expect(result.success).toBe(false);
  });

  it("caps notes length to prevent abuse", () => {
    const result = publicBookingSchema.safeParse({ ...valid, notes: "x".repeat(1000) });
    expect(result.success).toBe(false);
  });
});

describe("inviteMemberSchema", () => {
  it("only accepts known roles", () => {
    expect(inviteMemberSchema.safeParse({ email: "a@b.com", role: "staff" }).success).toBe(true);
    expect(inviteMemberSchema.safeParse({ email: "a@b.com", role: "superadmin" }).success).toBe(false);
  });
});

describe("createTableSchema", () => {
  it("requires at least 1 seat", () => {
    expect(createTableSchema.safeParse({ locationId: "l1", name: "T1", seats: 0 }).success).toBe(false);
  });

  it("applies sensible defaults", () => {
    const result = createTableSchema.safeParse({ locationId: "l1", name: "T1", seats: 4 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shape).toBe("RECTANGLE");
    }
  });
});
