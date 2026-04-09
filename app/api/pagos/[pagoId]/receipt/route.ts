import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Los pagos estan temporalmente desactivados en la plataforma.",
    },
    { status: 410 },
  );
}