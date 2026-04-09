import { NextResponse } from "next/server";
import { Resend } from "resend";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "Perfectos Desconocidos <onboarding@resend.dev>";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      nombre?: string;
      apellido?: string;
      email?: string;
      mensaje?: string;
    };

    const { nombre, apellido, email, mensaje } = body;

    if (!nombre?.trim() || !apellido?.trim() || !email?.trim() || !mensaje?.trim()) {
      return NextResponse.json({ error: "Campos incompletos" }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error("[contacto] ADMIN_EMAIL no configurado");
      return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[contacto] RESEND_API_KEY no configurado");
      return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    const html = `
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"/><title>Nuevo mensaje de contacto</title></head>
<body style="margin:0;padding:24px 12px;background:#FFFFFF;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;margin:0 auto;border:1px solid #EEEEEE;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:20px 32px 8px 32px;background:#FF6B6B;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;">Nuevo mensaje de contacto</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 8px 0;font-size:14px;color:#666;text-transform:uppercase;letter-spacing:.08em;">Remitente</p>
              <p style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#1A1A1A;">${escapeHtml(nombre.trim())} ${escapeHtml(apellido.trim())}</p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#444;"><a href="mailto:${escapeHtml(email.trim())}" style="color:#FF6B6B;">${escapeHtml(email.trim())}</a></p>

              <p style="margin:0 0 8px 0;font-size:14px;color:#666;text-transform:uppercase;letter-spacing:.08em;">Mensaje</p>
              <div style="border-left:4px solid #FF6B6B;background:#FFF9F8;padding:14px 16px;font-size:15px;line-height:1.7;color:#1A1A1A;white-space:pre-wrap;">${escapeHtml(mensaje.trim())}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 24px;font-size:12px;color:#999;text-align:center;">
              Mensaje enviado desde el formulario de contacto de Perfectos Desconocidos
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await resend.emails.send({
      from: EMAIL_FROM,
      to: adminEmail,
      reply_to: email.trim(),
      subject: `Nuevo mensaje de contacto de ${nombre.trim()} ${apellido.trim()}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contacto] Error al enviar email:", error);
    return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
  }
}
