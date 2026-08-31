"use server";

import { headers } from "next/headers";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { onboardingSchema } from "@/server/validation/onboarding";
import { slugify } from "@/lib/slug";
import { logger } from "@/lib/logger";

type ActionResult = { success: true } | { success: false; error: string };

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const baseSlug = slugify(base);
  if (!(await exists(baseSlug))) return baseSlug;
  for (let i = 2; i <= 20; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${baseSlug}-${createId().slice(0, 6)}`;
}

/**
 * Spec section 8: signup creates User + Organization + Membership(OWNER) +
 * first RestaurantLocation + RestaurantSettings, then redirects to the
 * Dashboard. Better Auth owns password hashing and session creation; the
 * business rows are created together in one Prisma transaction so the
 * account is never left half-provisioned.
 */
export async function completeSignup(rawInput: unknown): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const input = parsed.data;
  const requestHeaders = await headers();

  let userId: string;
  try {
    const signUpResult = await auth.api.signUpEmail({
      body: { name: input.name, email: input.email, password: input.password },
      headers: requestHeaders,
      asResponse: false,
    });
    userId = signUpResult.user.id;
  } catch (error) {
    const message =
      error instanceof Error && "message" in error
        ? error.message
        : "Impossible de créer le compte.";
    return { success: false, error: friendlySignupError(message) };
  }

  try {
    const organizationSlug = await uniqueSlug(
      input.restaurantName,
      async (slug) => Boolean(await db.organization.findUnique({ where: { slug } }))
    );
    const publicSlug = await uniqueSlug(
      input.restaurantName,
      async (slug) => Boolean(await db.restaurantLocation.findUnique({ where: { publicSlug: slug } }))
    );

    const organizationId = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: input.restaurantName, slug: organizationSlug },
      });

      await tx.member.create({
        data: { organizationId: organization.id, userId, role: "owner" },
      });

      const location = await tx.restaurantLocation.create({
        data: {
          organizationId: organization.id,
          name: input.restaurantName,
          email: input.email,
          phone: input.phone || null,
          address: input.address || null,
          timezone: "Europe/Paris",
          publicSlug,
        },
      });

      await tx.restaurantSettings.create({
        data: { locationId: location.id },
      });

      return organization.id;
    });
    void organizationId; // TableFlow supports one organization per user; requireUserOrganization()
    // falls back to the user's first membership, so no "active organization"
    // needs to be stamped on the session here.
  } catch (error) {
    logger.error("onboarding.provisioning_failed", {
      userId,
      error: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : String(error),
    });
    return {
      success: false,
      error: "Votre compte a été créé mais la configuration du restaurant a échoué. Contactez le support.",
    };
  }

  return { success: true };
}

function friendlySignupError(message: string): string {
  if (message.toLowerCase().includes("already exist") || message.toLowerCase().includes("already in use")) {
    return "Un compte existe déjà avec cet email.";
  }
  return "Impossible de créer le compte. Vérifiez vos informations.";
}
