import { Resend } from "resend";

import type { PaymentSummary } from "@/lib/payments/types";

type EmailPayload = {
  to: string[];
  subject: string;
  html: string;
};

type ContactRequestEmailPayload = {
  to: string[];
  senderName: string;
  senderAge: number;
  senderPhotoUrl: string | null;
  compatibility: number;
  message: string;
  acceptUrl: string;
  rejectUrl: string;
};

type ContactAcceptedEmailPayload = {
  to: string[];
  recipientName: string;
  recipientPhotoUrl?: string | null;
  compatibility?: number;
  chatUrl: string;
};

type ContactRejectedEmailPayload = {
  to: string[];
  senderName: string;
  recipientName: string;
  exploreUrl?: string;
};

type WelcomeEmailPayload = {
  to: string[];
  name: string;
};

type NewChatMessageEmailPayload = {
  to: string[];
  senderName: string;
  messagePreview: string;
  chatUrl: string;
};

type TenantPaymentSuccessEmailPayload = {
  to: string[];
  payment: PaymentSummary;
  ownerName: string;
  propertyAddress: string;
  releaseDateLabel: string;
  paymentUrl: string;
};

type OwnerPaymentReceivedEmailPayload = {
  to: string[];
  tenantName: string;
  payment: PaymentSummary;
  releaseDateLabel: string;
  detailsUrl: string;
};

type IncidentAlertEmailPayload = {
  to: string[];
  paymentId: string;
  description: string;
  tenantName: string;
  ownerName: string;
  reviewUrl: string;
};

const BRAND_NAME = "Perfectos Desconocidos";
const PRIMARY = "#FF6B6B";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#666666";
const BG = "#FFFFFF";
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://perfectos-desconocidos-5hgb.vercel.app";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Perfectos Desconocidos <onboarding@resend.dev>";
const UNSUBSCRIBE_URL = process.env.EMAIL_UNSUBSCRIBE_URL ?? `${APP_URL}/unsubscribe`;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  try {
    return JSON.parse(JSON.stringify(error));
  } catch {
    return { message: String(error) };
  }
}

function logEmailError(context: string, error: unknown, meta?: Record<string, unknown>) {
  console.error("[email:error]", {
    context,
    ...meta,
    error: serializeError(error),
  });
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fallbackAvatarInitial(name: string) {
  return (name.trim().charAt(0) || "P").toUpperCase();
}

function renderFooter() {
  return `
    <tr>
      <td style="padding:24px 40px 32px 40px; font-family:Arial,sans-serif; font-size:12px; line-height:1.6; color:${TEXT_SECONDARY}; text-align:center;">
        <p style="margin:0 0 8px 0;">${BRAND_NAME} - Encontrando companeros de piso compatibles</p>
        <p style="margin:0;">No quieres recibir estos correos? <a href="${UNSUBSCRIBE_URL}" style="color:${TEXT_SECONDARY};">Darse de baja</a></p>
      </td>
    </tr>
  `;
}

function renderLayout(title: string, body: string) {
  return `
  <!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0; padding:24px 12px; background:${BG};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG};">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; margin:0 auto; background:${BG}; border:1px solid #EEEEEE; border-radius:12px; overflow:hidden;">
              <tr>
                <td style="padding:24px 40px 8px 40px; font-family:Arial,sans-serif; background:#FFFFFF; text-align:left;">
                  <div style="font-size:24px; font-weight:700; color:${PRIMARY}; line-height:1.2;">${BRAND_NAME}</div>
                </td>
              </tr>
              ${body}
              ${renderFooter()}
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

async function safeSend(payload: EmailPayload) {
  try {
    const client = getResendClient();
    if (!client) {
      console.info("[email:skip] Missing RESEND_API_KEY", payload.subject, payload.to.join(", "));
      return;
    }

    const bcc = process.env.ADMIN_EMAIL ?? "";
    await client.emails.send({
      from: EMAIL_FROM,
      to: payload.to,
      ...(bcc ? { bcc } : {}),
      subject: payload.subject,
      html: payload.html,
    });
  } catch (error) {
    logEmailError("safeSend", error, {
      subject: payload.subject,
      to: payload.to,
      from: EMAIL_FROM,
    });
  }
}

export async function sendNotificationEmail(payload: EmailPayload) {
  await safeSend(payload);
}

export async function sendContactRequestEmail(payload: ContactRequestEmailPayload) {
  try {
    const subject = `[${payload.senderName}] quiere conocerte en Perfectos Desconocidos`;
    const avatar = payload.senderPhotoUrl
      ? `<img src="${payload.senderPhotoUrl}" alt="${escapeHtml(payload.senderName)}" width="88" height="88" style="display:block; width:88px; height:88px; border-radius:50%; object-fit:cover;"/>`
      : `<div style="width:88px; height:88px; border-radius:50%; background:#F5F5F5; color:${TEXT_SECONDARY}; font-family:Arial,sans-serif; font-size:34px; font-weight:700; line-height:88px; text-align:center;">${fallbackAvatarInitial(payload.senderName)}</div>`;

    const html = renderLayout(
      subject,
      `
      <tr>
        <td style="padding:8px 40px 0 40px; font-family:Arial,sans-serif; color:${TEXT_PRIMARY};">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td width="100" valign="top">${avatar}</td>
              <td valign="top" style="padding-left:16px;">
                <p style="margin:0; font-size:30px; font-weight:700; line-height:1.2; color:${TEXT_PRIMARY};">${escapeHtml(payload.senderName)}, ${payload.senderAge}</p>
                <p style="margin:10px 0 0 0; font-size:16px; color:${TEXT_SECONDARY};">Compatibilidad: <strong style="color:${PRIMARY};">${payload.compatibility}%</strong></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 40px 0 40px; font-family:Arial,sans-serif;">
          <div style="border-left:4px solid ${PRIMARY}; background:#FFF9F8; padding:14px 16px; font-size:15px; line-height:1.7; color:${TEXT_PRIMARY}; white-space:pre-wrap;">
            ${escapeHtml(payload.message || "Hola! Me gustaria hablar contigo.")}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 40px 0 40px; text-align:center; font-family:Arial,sans-serif;">
          <a href="${payload.acceptUrl}" style="display:inline-block; min-width:220px; margin:0 0 12px 0; border-radius:8px; background:${PRIMARY}; color:#FFFFFF; text-decoration:none; padding:14px 28px; font-size:16px; font-weight:700;">Aceptar solicitud</a><br/>
          <a href="${payload.rejectUrl}" style="display:inline-block; min-width:220px; border-radius:8px; background:#F5F5F5; color:#444444; text-decoration:none; padding:14px 28px; font-size:16px; font-weight:700;">No me interesa</a>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 40px 0 40px; font-family:Arial,sans-serif; font-size:13px; line-height:1.6; color:${TEXT_SECONDARY}; text-align:center;">
          Al aceptar, se abrira un chat privado entre los dos para que podais hablar directamente.
        </td>
      </tr>
    `,
    );

    await safeSend({ to: payload.to, subject, html });
  } catch (error) {
    logEmailError("sendContactRequestEmail", error, {
      to: payload.to,
      senderName: payload.senderName,
    });
  }
}

export async function sendContactAcceptedEmail(payload: ContactAcceptedEmailPayload) {
  try {
    const subject = `${payload.recipientName} ha aceptado tu solicitud en Perfectos Desconocidos`;
    const avatar = payload.recipientPhotoUrl
      ? `<img src="${payload.recipientPhotoUrl}" alt="${escapeHtml(payload.recipientName)}" width="76" height="76" style="display:block; width:76px; height:76px; border-radius:50%; object-fit:cover; margin:0 auto;"/>`
      : `<div style="width:76px; height:76px; border-radius:50%; background:#F5F5F5; color:${TEXT_SECONDARY}; font-family:Arial,sans-serif; font-size:28px; font-weight:700; line-height:76px; text-align:center; margin:0 auto;">${fallbackAvatarInitial(payload.recipientName)}</div>`;

    const html = renderLayout(
      subject,
      `
      <tr>
        <td style="padding:12px 40px 0 40px; text-align:center; font-family:Arial,sans-serif;">
          ${avatar}
          <p style="margin:14px 0 0 0; font-size:24px; font-weight:700; color:${TEXT_PRIMARY};">${escapeHtml(payload.recipientName)} ha aceptado tu solicitud</p>
          <p style="margin:10px 0 0 0; font-size:15px; line-height:1.7; color:${TEXT_SECONDARY};">Ya teneis el contacto desbloqueado. Es un gran momento para escribir el primer mensaje.</p>
          ${typeof payload.compatibility === "number" ? `<p style="margin:10px 0 0 0; font-size:15px; color:${TEXT_SECONDARY};">Compatibilidad: <strong style="color:${PRIMARY};">${payload.compatibility}%</strong></p>` : ""}
        </td>
      </tr>
      <tr>
        <td style="padding:24px 40px 0 40px; text-align:center; font-family:Arial,sans-serif;">
          <a href="${payload.chatUrl}" style="display:inline-block; border-radius:8px; background:${PRIMARY}; color:#FFFFFF; text-decoration:none; padding:14px 28px; font-size:16px; font-weight:700;">Abrir chat</a>
        </td>
      </tr>
    `,
    );

    await safeSend({ to: payload.to, subject, html });
  } catch (error) {
    logEmailError("sendContactAcceptedEmail", error, {
      to: payload.to,
      recipientName: payload.recipientName,
    });
  }
}

export async function sendContactRejectedEmail(payload: ContactRejectedEmailPayload) {
  try {
    const subject = "Actualizacion de tu solicitud en Perfectos Desconocidos";
    const exploreUrl = payload.exploreUrl ?? `${APP_URL}/explore`;
    const html = renderLayout(
      subject,
      `
      <tr>
        <td style="padding:12px 40px 0 40px; font-family:Arial,sans-serif; color:${TEXT_PRIMARY};">
          <p style="margin:0; font-size:24px; font-weight:700;">Tu solicitud no fue aceptada esta vez</p>
          <p style="margin:12px 0 0 0; font-size:15px; line-height:1.7; color:${TEXT_SECONDARY};">Hola ${escapeHtml(payload.senderName)}, ${escapeHtml(payload.recipientName)} ha decidido no continuar por ahora.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 40px 0 40px; text-align:center; font-family:Arial,sans-serif;">
          <a href="${exploreUrl}" style="display:inline-block; border-radius:8px; background:${PRIMARY}; color:#FFFFFF; text-decoration:none; padding:14px 28px; font-size:16px; font-weight:700;">Seguir explorando</a>
        </td>
      </tr>
    `,
    );

    await safeSend({ to: payload.to, subject, html });
  } catch (error) {
    logEmailError("sendContactRejectedEmail", error, {
      to: payload.to,
      recipientName: payload.recipientName,
    });
  }
}

export async function sendWelcomeEmail(payload: WelcomeEmailPayload) {
  try {
    const subject = `Bienvenido a Perfectos Desconocidos, ${payload.name}`;
    const html = renderLayout(
      subject,
      `
      <tr>
        <td style="padding:12px 40px 0 40px; font-family:Arial,sans-serif; color:${TEXT_PRIMARY};">
          <p style="margin:0; font-size:26px; font-weight:700;">Bienvenido, ${escapeHtml(payload.name)}</p>
          <p style="margin:12px 0 0 0; font-size:15px; line-height:1.7; color:${TEXT_SECONDARY};">Ya formas parte de la comunidad. Estos son los 3 pasos para encontrar companero ideal:</p>
          <ol style="margin:12px 0 0 20px; padding:0; font-size:15px; line-height:1.8; color:${TEXT_PRIMARY};">
            <li>Explora perfiles compatibles.</li>
            <li>Solicita contacto con un mensaje personal.</li>
            <li>Habla por el chat privado y concreta detalles.</li>
          </ol>
          <p style="margin:14px 0 0 0; font-size:14px; line-height:1.7; color:${TEXT_SECONDARY};">Consejo: completa tu perfil con una buena foto para recibir mas solicitudes.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 40px 0 40px; text-align:center; font-family:Arial,sans-serif;">
          <a href="${APP_URL}/explore" style="display:inline-block; border-radius:8px; background:${PRIMARY}; color:#FFFFFF; text-decoration:none; padding:14px 28px; font-size:16px; font-weight:700;">Empezar a explorar</a>
        </td>
      </tr>
    `,
    );

    await safeSend({ to: payload.to, subject, html });
  } catch (error) {
    logEmailError("sendWelcomeEmail", error, {
      to: payload.to,
      name: payload.name,
    });
  }
}

export async function sendNewChatMessageEmail(payload: NewChatMessageEmailPayload) {
  try {
    const subject = `Nuevo mensaje de ${payload.senderName} en Perfectos Desconocidos`;
    const preview = payload.messagePreview.trim().slice(0, 180);
    const html = renderLayout(
      subject,
      `
      <tr>
        <td style="padding:12px 40px 0 40px; font-family:Arial,sans-serif; color:${TEXT_PRIMARY};">
          <p style="margin:0; font-size:24px; font-weight:700;">Tienes un nuevo mensaje</p>
          <p style="margin:12px 0 0 0; font-size:15px; line-height:1.7; color:${TEXT_SECONDARY};">
            ${escapeHtml(payload.senderName)} te ha escrito en el chat.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 40px 0 40px; font-family:Arial,sans-serif;">
          <div style="border-left:4px solid ${PRIMARY}; background:#FFF9F8; padding:14px 16px; font-size:15px; line-height:1.7; color:${TEXT_PRIMARY}; white-space:pre-wrap;">
            ${escapeHtml(preview || "Tienes un nuevo mensaje en tu chat.")}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 40px 0 40px; text-align:center; font-family:Arial,sans-serif;">
          <a href="${payload.chatUrl}" style="display:inline-block; border-radius:8px; background:${PRIMARY}; color:#FFFFFF; text-decoration:none; padding:14px 28px; font-size:16px; font-weight:700;">Abrir chat</a>
        </td>
      </tr>
    `,
    );

    await safeSend({ to: payload.to, subject, html });
  } catch (error) {
    logEmailError("sendNewChatMessageEmail", error, {
      to: payload.to,
      senderName: payload.senderName,
    });
  }
}

export async function sendTenantPaymentSuccessEmail(payload: TenantPaymentSuccessEmailPayload) {
  try {
    const amountLabel = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(payload.payment.cantidad);
    const subject = "Pago realizado con exito - Perfectos Desconocidos";
    const html = renderLayout(
      subject,
      `
      <tr>
        <td style="padding:12px 40px 0 40px; font-family:Arial,sans-serif; color:${TEXT_PRIMARY};">
          <p style="margin:0; font-size:24px; font-weight:700;">Pago realizado con exito</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:14px; border:1px solid #EFEFEF; border-radius:8px;">
            <tr><td style="padding:12px 14px; font-size:14px; color:${TEXT_PRIMARY};">Importe: <strong>${amountLabel}</strong></td></tr>
            <tr><td style="padding:0 14px 12px 14px; font-size:14px; color:${TEXT_PRIMARY};">Propietario: <strong>${escapeHtml(payload.ownerName)}</strong></td></tr>
            <tr><td style="padding:0 14px 12px 14px; font-size:14px; color:${TEXT_PRIMARY};">Piso: <strong>${escapeHtml(payload.propertyAddress)}</strong></td></tr>
            <tr><td style="padding:0 14px 12px 14px; font-size:14px; color:${TEXT_PRIMARY};">Liberacion al propietario: <strong>${escapeHtml(payload.releaseDateLabel)}</strong></td></tr>
          </table>
          <p style="margin:14px 0 0 0; font-size:14px; line-height:1.7; color:${TEXT_SECONDARY};">El dinero queda en custodia para proteger a ambas partes. Si hay una incidencia, puedes reportarla en las primeras 48 horas.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 40px 0 40px; text-align:center; font-family:Arial,sans-serif;">
          <a href="${payload.paymentUrl}" style="display:inline-block; border-radius:8px; background:${PRIMARY}; color:#FFFFFF; text-decoration:none; padding:14px 28px; font-size:16px; font-weight:700;">Ver estado del pago</a>
        </td>
      </tr>
    `,
    );

    await safeSend({ to: payload.to, subject, html });
  } catch (error) {
    logEmailError("sendTenantPaymentSuccessEmail", error, {
      to: payload.to,
      ownerName: payload.ownerName,
      paymentId: payload.payment.id,
    });
  }
}

export async function sendOwnerPaymentReceivedEmail(payload: OwnerPaymentReceivedEmailPayload) {
  try {
    const amountLabel = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(payload.payment.cantidad);
    const subject = "Has recibido un pago en Perfectos Desconocidos";
    const html = renderLayout(
      subject,
      `
      <tr>
        <td style="padding:12px 40px 0 40px; font-family:Arial,sans-serif; color:${TEXT_PRIMARY};">
          <p style="margin:0; font-size:24px; font-weight:700;">Has recibido un pago</p>
          <p style="margin:12px 0 0 0; font-size:15px; line-height:1.7; color:${TEXT_PRIMARY};">Inquilino: <strong>${escapeHtml(payload.tenantName)}</strong></p>
          <p style="margin:6px 0 0 0; font-size:15px; line-height:1.7; color:${TEXT_PRIMARY};">Importe: <strong>${amountLabel}</strong></p>
          <p style="margin:6px 0 0 0; font-size:15px; line-height:1.7; color:${TEXT_PRIMARY};">Recibiras el dinero en tu cuenta el: <strong>${escapeHtml(payload.releaseDateLabel)}</strong></p>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 40px 0 40px; text-align:center; font-family:Arial,sans-serif;">
          <a href="${payload.detailsUrl}" style="display:inline-block; border-radius:8px; background:${PRIMARY}; color:#FFFFFF; text-decoration:none; padding:14px 28px; font-size:16px; font-weight:700;">Ver detalles</a>
        </td>
      </tr>
    `,
    );

    await safeSend({ to: payload.to, subject, html });
  } catch (error) {
    logEmailError("sendOwnerPaymentReceivedEmail", error, {
      to: payload.to,
      tenantName: payload.tenantName,
      paymentId: payload.payment.id,
    });
  }
}

export async function sendIncidentAlertEmail(payload: IncidentAlertEmailPayload) {
  try {
    const subject = "Nueva incidencia abierta - accion requerida";
    const html = renderLayout(
      subject,
      `
      <tr>
        <td style="padding:12px 40px 0 40px; font-family:Arial,sans-serif; color:${TEXT_PRIMARY};">
          <p style="margin:0; font-size:24px; font-weight:700;">Nueva incidencia abierta</p>
          <p style="margin:12px 0 0 0; font-size:14px; line-height:1.7; color:${TEXT_PRIMARY};">Pago afectado: <strong>${escapeHtml(payload.paymentId)}</strong></p>
          <p style="margin:6px 0 0 0; font-size:14px; line-height:1.7; color:${TEXT_PRIMARY};">Inquilino: <strong>${escapeHtml(payload.tenantName)}</strong></p>
          <p style="margin:6px 0 0 0; font-size:14px; line-height:1.7; color:${TEXT_PRIMARY};">Propietario: <strong>${escapeHtml(payload.ownerName)}</strong></p>
          <div style="margin-top:12px; border-left:4px solid ${PRIMARY}; background:#FFF9F8; padding:12px 14px; font-size:14px; line-height:1.7; color:${TEXT_PRIMARY}; white-space:pre-wrap;">
            ${escapeHtml(payload.description)}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 40px 0 40px; text-align:center; font-family:Arial,sans-serif;">
          <a href="${payload.reviewUrl}" style="display:inline-block; border-radius:8px; background:${PRIMARY}; color:#FFFFFF; text-decoration:none; padding:14px 28px; font-size:16px; font-weight:700;">Revisar incidencia</a>
        </td>
      </tr>
    `,
    );

    await safeSend({ to: payload.to, subject, html });
  } catch (error) {
    logEmailError("sendIncidentAlertEmail", error, {
      to: payload.to,
      paymentId: payload.paymentId,
    });
  }
}
