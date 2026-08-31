function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#111827;padding:20px 24px;">
          <span style="color:#ffffff;font-size:18px;font-weight:bold;">TableFlow</span>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="font-size:18px;margin:0 0 16px;">${title}</h1>
          ${bodyHtml}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;">${label}</a>`;
}

export function emailVerificationTemplate(url: string) {
  const html = layout(
    "Confirmez votre adresse email",
    `<p>Merci de votre inscription sur TableFlow. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email.</p>${button(url, "Confirmer mon email")}<p style="margin-top:16px;font-size:12px;color:#666;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
  );
  const text = `Confirmez votre adresse email en ouvrant ce lien : ${url}`;
  return { html, text };
}

export function passwordResetTemplate(url: string) {
  const html = layout(
    "Réinitialisation de votre mot de passe",
    `<p>Vous avez demandé la réinitialisation de votre mot de passe TableFlow.</p>${button(url, "Réinitialiser mon mot de passe")}<p style="margin-top:16px;font-size:12px;color:#666;">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
  );
  const text = `Réinitialisez votre mot de passe en ouvrant ce lien : ${url}`;
  return { html, text };
}

export function invitationTemplate(input: {
  organizationName: string;
  inviterName: string;
  url: string;
  role: string;
}) {
  const html = layout(
    "Vous êtes invité(e) sur TableFlow",
    `<p>${input.inviterName} vous invite à rejoindre <strong>${input.organizationName}</strong> sur TableFlow avec le rôle <strong>${input.role}</strong>.</p>${button(input.url, "Accepter l'invitation")}`
  );
  const text = `${input.inviterName} vous invite à rejoindre ${input.organizationName} sur TableFlow. Ouvrez ce lien pour accepter : ${input.url}`;
  return { html, text };
}

export function bookingConfirmationTemplate(input: {
  restaurantName: string;
  address: string | null;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
}) {
  const html = layout(
    "Réservation confirmée",
    `<p>Votre réservation chez <strong>${input.restaurantName}</strong> est confirmée.</p>
     <table role="presentation" style="margin-top:12px;font-size:14px;">
       <tr><td style="padding:4px 12px 4px 0;color:#666;">Date</td><td>${input.dateLabel}</td></tr>
       <tr><td style="padding:4px 12px 4px 0;color:#666;">Heure</td><td>${input.timeLabel}</td></tr>
       <tr><td style="padding:4px 12px 4px 0;color:#666;">Personnes</td><td>${input.partySize}</td></tr>
       ${input.address ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Adresse</td><td>${input.address}</td></tr>` : ""}
     </table>`
  );
  const text = `Réservation confirmée chez ${input.restaurantName} le ${input.dateLabel} à ${input.timeLabel} pour ${input.partySize} personne(s).`;
  return { html, text };
}

export function restaurantBookingNotificationTemplate(input: {
  customerName: string;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
}) {
  const html = layout(
    "Nouvelle réservation en ligne",
    `<p>Nouvelle réservation reçue via le formulaire public.</p>
     <table role="presentation" style="margin-top:12px;font-size:14px;">
       <tr><td style="padding:4px 12px 4px 0;color:#666;">Client</td><td>${input.customerName}</td></tr>
       <tr><td style="padding:4px 12px 4px 0;color:#666;">Date</td><td>${input.dateLabel}</td></tr>
       <tr><td style="padding:4px 12px 4px 0;color:#666;">Heure</td><td>${input.timeLabel}</td></tr>
       <tr><td style="padding:4px 12px 4px 0;color:#666;">Personnes</td><td>${input.partySize}</td></tr>
     </table>`
  );
  const text = `Nouvelle réservation en ligne : ${input.customerName}, ${input.dateLabel} ${input.timeLabel}, ${input.partySize} personne(s).`;
  return { html, text };
}
