import { NextResponse } from "next/server";

import { getPaymentRow, getPiso, getUser } from "@/lib/payments/service";
import { formatMoney } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildPdf(lines: string[]) {
  const contentLines = lines.map((line, index) => {
    const y = 760 - index * 18;
    return `BT /F1 12 Tf 72 ${y} Td (${escapePdfText(line)}) Tj ET`;
  });
  const stream = contentLines.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(output.length);
    output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    output += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(output);
}

export async function GET(_request: Request, { params }: { params: Promise<{ pagoId: string }> }) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { pagoId } = await params;
  const payment = await getPaymentRow(pagoId);
  if (!payment || (payment.inquilinoId !== user.id && payment.propietarioId !== user.id)) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  const [tenant, owner, piso] = await Promise.all([getUser(payment.inquilinoId), getUser(payment.propietarioId), payment.pisoId ? getPiso(payment.pisoId) : null]);

  const lines = [
    "Perfectos Desconocidos",
    `Pago ${payment.id}`,
    `Inquilino: ${tenant?.nombre ?? "Desconocido"}`,
    `Propietario: ${owner?.nombre ?? "Desconocido"}`,
    `Piso: ${piso?.direccion ?? piso?.zona ?? "Sin dirección"}`,
    `Importe: ${formatMoney(Number(payment.cantidad))}`,
    `Estado: ${payment.estado}`,
  ];

  const pdf = buildPdf(lines);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=recibo-${payment.id}.pdf`,
    },
  });
}