import { NextResponse } from "next/server";

import { createConnectAccountLink } from "@/lib/payments/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "Tu usuario no tiene email" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  try {
    const { url, accountId } = await createConnectAccountLink({
      userId: user.id,
      email: user.email,
      returnUrl: `${origin}/settings/payments?stripe=return`,
      refreshUrl: `${origin}/settings/payments?stripe=refresh`,
    });

    return NextResponse.json({ ok: true, url, accountId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el enlace de Stripe" },
      { status: 400 },
    );
  }
}