import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "@/lib/logger";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let cachedTransporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !port) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return cachedTransporter;
}

/**
 * Single entry point for all outgoing transactional email. Never call
 * nodemailer directly from feature code — see spec section 81 ("ne pas
 * disperser le code SMTP dans toute l'application").
 *
 * When SMTP is not configured (local development), the email is logged
 * instead of sent so the app remains fully runnable without a mail
 * provider.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || "TableFlow <no-reply@tableflow.local>";

  if (!transporter) {
    logger.warn("email.not_configured", { to: input.to, subject: input.subject });
    return;
  }

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } catch (error) {
    logger.error("email.send_failed", {
      to: input.to,
      subject: input.subject,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
