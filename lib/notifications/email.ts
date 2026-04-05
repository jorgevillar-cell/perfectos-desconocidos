type EmailPayload = {
  to: string[];
  subject: string;
  html: string;
};

export async function sendNotificationEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Perfectos Desconocidos <no-reply@perfectosdesconocidos.com>";

  if (!apiKey) {
    console.info("[email]", payload.subject, payload.to.join(", "));
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`No se pudo enviar el email: ${body}`);
  }
}