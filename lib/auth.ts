import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { accessControl, roles } from "@/lib/permissions";
import { sendEmailVerification, sendInvitation, sendPasswordReset } from "@/lib/email";
import { logger } from "@/lib/logger";

const appUrl = process.env.APP_URL || "http://localhost:3000";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordReset(user.email, url);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmailVerification(user.email, url);
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day of activity
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  trustedOrigins: [appUrl],

  rateLimit: {
    window: 60,
    max: 30,
  },

  plugins: [
    organization({
      ac: accessControl,
      roles,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 48, // 48h
      cancelPendingInvitationsOnReInvite: true,
      allowUserToCreateOrganization: true,
      sendInvitationEmail: async (data) => {
        const acceptUrl = `${appUrl}/accept-invitation/${data.id}`;
        try {
          await sendInvitation({
            to: data.email,
            organizationName: data.organization.name,
            inviterName: data.inviter.user.name,
            url: acceptUrl,
            role: data.role,
          });
        } catch (error) {
          logger.error("invitation.email_failed", {
            organizationId: data.organization.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    }),
    // Must be the last plugin: lets Server Actions set/read auth cookies.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
