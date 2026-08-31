import { sendEmail } from "@/lib/mailer";
import {
  bookingConfirmationTemplate,
  emailVerificationTemplate,
  invitationTemplate,
  passwordResetTemplate,
  restaurantBookingNotificationTemplate,
} from "@/emails/templates";

export async function sendEmailVerification(to: string, url: string) {
  const { html, text } = emailVerificationTemplate(url);
  await sendEmail({ to, subject: "Confirmez votre adresse email", html, text });
}

export async function sendPasswordReset(to: string, url: string) {
  const { html, text } = passwordResetTemplate(url);
  await sendEmail({ to, subject: "Réinitialisation de votre mot de passe", html, text });
}

export async function sendInvitation(input: {
  to: string;
  organizationName: string;
  inviterName: string;
  url: string;
  role: string;
}) {
  const { html, text } = invitationTemplate(input);
  await sendEmail({
    to: input.to,
    subject: `Invitation à rejoindre ${input.organizationName} sur TableFlow`,
    html,
    text,
  });
}

export async function sendBookingConfirmation(input: {
  to: string;
  restaurantName: string;
  address: string | null;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
}) {
  const { html, text } = bookingConfirmationTemplate(input);
  await sendEmail({ to: input.to, subject: `Réservation confirmée - ${input.restaurantName}`, html, text });
}

export async function sendRestaurantBookingNotification(input: {
  to: string;
  customerName: string;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
}) {
  const { html, text } = restaurantBookingNotificationTemplate(input);
  await sendEmail({ to: input.to, subject: "Nouvelle réservation en ligne", html, text });
}
