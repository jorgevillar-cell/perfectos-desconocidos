import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

type RawUser = {
  id: string;
  nombre: string | null;
  email: string | null;
  fotoUrl: string | null;
  ciudad: string | null;
  creadoEn: string | null;
  perfil_convivencia: Array<{ situacion: string | null }> | null;
};

type RawMatch = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  estado: string;
  mensajePresentacion: string | null;
  fechaSolicitud: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES");
}

function situacion(user: RawUser): string | null {
  const perfil = Array.isArray(user.perfil_convivencia)
    ? user.perfil_convivencia[0]
    : user.perfil_convivencia;
  return (perfil as { situacion: string | null } | null)?.situacion ?? null;
}

function SituacionBadge({ value }: { value: string | null }) {
  if (value === "tengo_piso_libre") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[12px] font-semibold text-green-700">
        Tiene piso
      </span>
    );
  }
  if (value === "busco_habitacion") {
    return (
      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[12px] font-semibold text-blue-700">
        Busca habitación
      </span>
    );
  }
  if (value === "buscar_juntos") {
    return (
      <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[12px] font-semibold text-orange-700">
        Busca compañero
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-semibold text-gray-500">
      Sin completar
    </span>
  );
}

function EstadoBadge({ value }: { value: string }) {
  if (value === "solicitud_pendiente") {
    return (
      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[12px] font-semibold text-yellow-700">
        Pendiente
      </span>
    );
  }
  if (value === "solicitud_aceptada") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[12px] font-semibold text-green-700">
        Aceptada
      </span>
    );
  }
  if (value === "solicitud_rechazada") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[12px] font-semibold text-red-700">
        Rechazada
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-semibold text-gray-500">
      {value}
    </span>
  );
}

function UserAvatar({ nombre, fotoUrl }: { nombre: string | null; fotoUrl: string | null }) {
  const initial = (nombre ?? "U").trim().charAt(0).toUpperCase();
  if (fotoUrl?.trim()) {
    return (
      <img
        src={fotoUrl}
        alt={nombre ?? "Usuario"}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-[13px] font-bold text-gray-600">
      {initial}
    </span>
  );
}

function MetricCard({
  value,
  label,
  colorClass,
}: {
  value: number;
  label: string;
  colorClass: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-100 p-4 shadow-sm ${colorClass}`}>
      <p className="text-[28px] font-black leading-none">{value}</p>
      <p className="mt-1 text-[12px] font-semibold leading-tight">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/explore");
  }

  const [usersRes, matchesRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, nombre, email, fotoUrl, ciudad, creadoEn, perfil_convivencia(situacion)")
      .order("creadoEn", { ascending: false }),
    supabase
      .from("matches")
      .select("id, usuarioAId, usuarioBId, estado, mensajePresentacion, fechaSolicitud")
      .order("fechaSolicitud", { ascending: false }),
  ]);

  const users = (usersRes.data ?? []) as RawUser[];
  const matches = (matchesRes.data ?? []) as RawMatch[];
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Metrics
  const totalUsuarios = users.length;
  const tienePiso = users.filter((u) => situacion(u) === "tengo_piso_libre").length;
  const buscaHabitacion = users.filter((u) => situacion(u) === "busco_habitacion").length;
  const buscaCompanero = users.filter((u) => situacion(u) === "buscar_juntos").length;
  const solicitudesPendientes = matches.filter((m) => m.estado === "solicitud_pendiente").length;
  const contactosAceptados = matches.filter((m) => m.estado === "solicitud_aceptada").length;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-[1400px] space-y-10">

        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <h1 className="text-[32px] font-black text-gray-900">Panel de administración</h1>
          <p className="mt-1 text-[15px] font-semibold text-gray-500">Perfectos Desconocidos — Vista interna</p>
          <p className="mt-0.5 text-[13px] text-gray-400">{new Date().toLocaleString("es-ES")}</p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <MetricCard value={totalUsuarios} label="Usuarios registrados" colorClass="bg-blue-50 text-blue-700" />
          <MetricCard value={tienePiso} label="Tienen piso" colorClass="bg-green-50 text-green-700" />
          <MetricCard value={buscaHabitacion} label="Buscan habitación" colorClass="bg-purple-50 text-purple-700" />
          <MetricCard value={buscaCompanero} label="Buscan compañero" colorClass="bg-orange-50 text-orange-700" />
          <MetricCard value={solicitudesPendientes} label="Solicitudes pendientes" colorClass="bg-yellow-50 text-yellow-700" />
          <MetricCard value={contactosAceptados} label="Contactos aceptados" colorClass="bg-emerald-50 text-emerald-700" />
        </div>

        {/* Users table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-baseline gap-2 border-b border-gray-100 px-6 py-4">
            <h2 className="text-[16px] font-bold text-gray-900">Usuarios</h2>
            <span className="text-[14px] text-gray-400">({users.length})</span>
          </div>
          <div className="overflow-x-auto">
            {users.length === 0 ? (
              <div className="px-6 py-10 text-center text-[14px] text-gray-400">
                No hay registros todavía
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[12px] uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Situación</th>
                    <th className="px-4 py-3 font-semibold">Ciudad</th>
                    <th className="px-4 py-3 font-semibold">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, index) => (
                    <tr
                      key={u.id}
                      className={`border-t border-gray-100 transition-colors hover:bg-gray-100 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar nombre={u.nombre} fotoUrl={u.fotoUrl} />
                          <span className="font-semibold text-gray-800">{u.nombre ?? "Sin nombre"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <SituacionBadge value={situacion(u)} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.ciudad ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(u.creadoEn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Matches table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-baseline gap-2 border-b border-gray-100 px-6 py-4">
            <h2 className="text-[16px] font-bold text-gray-900">Solicitudes de contacto</h2>
            <span className="text-[14px] text-gray-400">({matches.length})</span>
          </div>
          <div className="overflow-x-auto">
            {matches.length === 0 ? (
              <div className="px-6 py-10 text-center text-[14px] text-gray-400">
                No hay registros todavía
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[12px] uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold">De</th>
                    <th className="px-4 py-3 font-semibold">Para</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Mensaje</th>
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, index) => {
                    const userA = userMap.get(m.usuarioAId);
                    const userB = userMap.get(m.usuarioBId);
                    const preview = m.mensajePresentacion?.trim().slice(0, 100);
                    return (
                      <tr
                        key={m.id}
                        className={`border-t border-gray-100 transition-colors hover:bg-gray-100 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UserAvatar nombre={userA?.nombre ?? null} fotoUrl={userA?.fotoUrl ?? null} />
                            <span className="font-semibold text-gray-800">
                              {userA?.nombre ?? "Usuario eliminado"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UserAvatar nombre={userB?.nombre ?? null} fotoUrl={userB?.fotoUrl ?? null} />
                            <span className="font-semibold text-gray-800">
                              {userB?.nombre ?? "Usuario eliminado"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <EstadoBadge value={m.estado} />
                        </td>
                        <td className="px-4 py-3 max-w-[280px] text-gray-600">
                          {preview ? (
                            <span>{preview}{(m.mensajePresentacion?.length ?? 0) > 100 ? "…" : ""}</span>
                          ) : (
                            <span className="italic text-gray-400">Sin mensaje</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(m.fechaSolicitud)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
