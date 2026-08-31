import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { createTestOrganization, cleanupOrganization, testDb } from "../helpers";
import {
  assertCanCreateLocation,
  assertCanInviteMember,
  getEffectivePlan,
  PlanLimitError,
  PLAN_LIMITS,
} from "@/server/services/subscription";

describe("subscription plan limits (integration, spec section 78)", () => {
  let organizationId: string;
  const originalStripeKey = process.env.STRIPE_SECRET_KEY;

  beforeAll(async () => {
    const { organization } = await createTestOrganization();
    organizationId = organization.id;
  });

  afterAll(async () => {
    await cleanupOrganization(organizationId);
  });

  beforeEach(() => {
    // Billing enforcement only activates when Stripe is configured.
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_for_tests";
  });

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = originalStripeKey;
  });

  it("reports no limits when Stripe is not configured (spec section 80)", async () => {
    process.env.STRIPE_SECRET_KEY = "";
    const plan = await getEffectivePlan(organizationId);
    expect(plan).toBeNull();
    await expect(assertCanCreateLocation(organizationId)).resolves.toBeUndefined();
  });

  it("new organizations get Starter-level trial limits when Stripe is configured", async () => {
    const plan = await getEffectivePlan(organizationId);
    expect(plan?.plan).toBe("starter");
    expect(plan?.limits.maxLocations).toBe(PLAN_LIMITS.starter.maxLocations);
  });

  it("blocks creating a second location beyond the Starter limit", async () => {
    // organizationId already has 1 location from the fixture; Starter allows 1.
    await expect(assertCanCreateLocation(organizationId)).rejects.toThrow(PlanLimitError);
  });

  it("blocks inviting beyond the Starter user limit", async () => {
    const org = await createTestOrganization({ name: "Solo Plan Org" });
    try {
      // Fixture already has 1 member (the owner); Starter allows 3.
      await testDb.member.createMany({
        data: [
          { organizationId: org.organization.id, userId: (await testDb.user.create({ data: { name: "U2", email: `u2-${Date.now()}@test.local` } })).id, role: "staff" },
          { organizationId: org.organization.id, userId: (await testDb.user.create({ data: { name: "U3", email: `u3-${Date.now()}@test.local` } })).id, role: "staff" },
        ],
      });
      await expect(assertCanInviteMember(org.organization.id)).rejects.toThrow(PlanLimitError);
    } finally {
      await cleanupOrganization(org.organization.id);
    }
  });

  it("an active Pro subscription raises the limits", async () => {
    await testDb.subscription.create({
      data: {
        organizationId,
        status: "ACTIVE",
        stripePriceId: "price_pro_test",
      },
    });
    process.env.STRIPE_PRICE_PRO = "price_pro_test";

    const plan = await getEffectivePlan(organizationId);
    expect(plan?.plan).toBe("pro");
    await expect(assertCanCreateLocation(organizationId)).resolves.toBeUndefined();

    delete process.env.STRIPE_PRICE_PRO;
  });
});
