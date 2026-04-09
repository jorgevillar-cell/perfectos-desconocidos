"use client";

import { useEffect, useState } from "react";

type Props = {
  currentUserId: string;
  currentUserName: string;
  onRequestLogout: () => void;
  onRequestDelete: () => void;
};

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

type Section = "email" | "password" | null;

export function ProfileWelcomePanel({
  currentUserId,
  currentUserName,
  onRequestLogout,
  onRequestDelete,
}: Props) {
  const [email, setEmail] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<Section>(null);

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/profile/me?full=true")
      .then((r) => r.json())
      .then((data: { authenticated: boolean; user?: { email?: string; fotoUrl?: string | null } }) => {
        if (data.authenticated && data.user) {
          setEmail(data.user.email ?? "");
          setFotoUrl(data.user.fotoUrl ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUserId]);

  function toggleSection(s: Section) {
    setOpenSection((prev) => (prev === s ? null : s));
    setEmailError("");
    setEmailSuccess(false);
    setPasswordError("");
    setPasswordSuccess(false);
  }

  async function handleEmailChange() {
    setEmailError("");
    setEmailSuccess(false);
    if (!newEmail.trim()) { setEmailError("Introduce el nuevo email"); return; }
    if (!emailPassword.trim()) { setEmailError("Introduce tu contraseña para confirmar"); return; }
    setEmailSaving(true);
    try {
      const res = await fetch("/api/auth/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), currentPassword: emailPassword }),
      });
      const result = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !result.ok) throw new Error(result.error ?? "Error al cambiar el email");
      setEmail(newEmail.trim());
      setEmailSuccess(true);
      setNewEmail("");
      setEmailPassword("");
      setTimeout(() => { setEmailSuccess(false); setOpenSection(null); }, 2500);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Error al cambiar el email");
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPasswordError("");
    setPasswordSuccess(false);
    if (!currentPassword) { setPasswordError("Introduce tu contraseña actual"); return; }
    if (newPassword.length < 8) { setPasswordError("La nueva contraseña debe tener al menos 8 caracteres"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Las contraseñas no coinciden"); return; }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !result.ok) throw new Error(result.error ?? "Error al cambiar la contraseña");
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => { setPasswordSuccess(false); setOpenSection(null); }, 2500);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Error al cambiar la contraseña");
    } finally {
      setPasswordSaving(false);
    }
  }

  const firstName = currentUserName?.split(" ")[0] ?? currentUserName;
  const initials = initialsFrom(currentUserName || "U");

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Bienvenida ─────────────────────────────── */}
      <div className="flex flex-col items-center px-6 pt-10 pb-6">
        <div className="mb-5 h-24 w-24 overflow-hidden rounded-full border-4 border-[#FFE4E4] bg-[#FFF5F5] shadow-[0_0_0_6px_rgba(255,107,107,0.08)]">
          {fotoUrl && !loading ? (
            <img src={fotoUrl} alt={currentUserName} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#FF6B6B]">
              {loading ? (
                <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                initials || "U"
              )}
            </span>
          )}
        </div>
        <h2 className="text-[22px] font-bold text-[#1A1A1A]">Hola, {firstName} 👋</h2>
        <p className="mt-1 text-[14px] text-[#6B7280]">Bienvenido/a a Perfectos Desconocidos</p>
      </div>

      {/* ── Tarjeta de cuenta ──────────────────────── */}
      <div className="mx-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)]">

        {/* Email */}
        <div className="border-b border-[#F3F4F6]">
          <button
            type="button"
            onClick={() => toggleSection("email")}
            className="flex w-full items-center gap-3 px-4 py-3.5 transition hover:bg-[#FAFAFA]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF5F5] text-[#FF6B6B]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Correo electrónico</p>
              <p className="truncate text-[14px] font-semibold text-[#1A1A1A]">{email || "—"}</p>
            </div>
            <span className="shrink-0 rounded-lg border border-[#E5E7EB] px-2 py-0.5 text-[11px] font-semibold text-[#6B7280]">
              Editar
            </span>
          </button>

          {openSection === "email" ? (
            <div className="border-t border-[#F3F4F6] px-4 pb-4 pt-3 space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#6B7280]">Nuevo email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2.5 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:bg-white focus:ring-2 focus:ring-[#FF6B6B]/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#6B7280]">Contraseña actual (para confirmar)</label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2.5 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:bg-white focus:ring-2 focus:ring-[#FF6B6B]/15"
                />
              </div>
              {emailError ? <p className="text-[13px] font-semibold text-red-500">{emailError}</p> : null}
              {emailSuccess ? <p className="text-[13px] font-semibold text-green-600">✓ Email actualizado</p> : null}
              <button
                type="button"
                onClick={handleEmailChange}
                disabled={emailSaving}
                className="w-full rounded-xl bg-[#FF6B6B] py-2.5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(255,107,107,0.3)] transition hover:bg-[#e55a5a] disabled:opacity-60"
              >
                {emailSaving ? "Guardando..." : "Guardar nuevo email"}
              </button>
            </div>
          ) : null}
        </div>

        {/* Contraseña */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("password")}
            className="flex w-full items-center gap-3 px-4 py-3.5 transition hover:bg-[#FAFAFA]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF5F5] text-[#FF6B6B]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Contraseña</p>
              <p className="text-[14px] font-semibold text-[#1A1A1A]">Cambiar contraseña</p>
            </div>
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform ${openSection === "password" ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {openSection === "password" ? (
            <div className="border-t border-[#F3F4F6] px-4 pb-4 pt-3 space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#6B7280]">Contraseña actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2.5 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:bg-white focus:ring-2 focus:ring-[#FF6B6B]/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#6B7280]">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2.5 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:bg-white focus:ring-2 focus:ring-[#FF6B6B]/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#6B7280]">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2.5 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:bg-white focus:ring-2 focus:ring-[#FF6B6B]/15"
                />
              </div>
              {passwordError ? <p className="text-[13px] font-semibold text-red-500">{passwordError}</p> : null}
              {passwordSuccess ? <p className="text-[13px] font-semibold text-green-600">✓ Contraseña actualizada</p> : null}
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={passwordSaving}
                className="w-full rounded-xl bg-[#FF6B6B] py-2.5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(255,107,107,0.3)] transition hover:bg-[#e55a5a] disabled:opacity-60"
              >
                {passwordSaving ? "Guardando..." : "Guardar nueva contraseña"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Zona de cuenta ─────────────────────────── */}
      <div className="mx-6 mt-4 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={onRequestLogout}
          className="flex w-full items-center gap-3 border-b border-[#F3F4F6] px-4 py-3.5 transition hover:bg-[#FAFAFA]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B7280]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span className="text-[14px] font-semibold text-[#374151]">Cerrar sesión</span>
        </button>

        <button
          type="button"
          onClick={onRequestDelete}
          className="flex w-full items-center gap-3 px-4 py-3.5 transition hover:bg-[#FEF2F2]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#EF4444]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M6 6l1 14h10l1-14" />
            </svg>
          </span>
          <span className="text-[14px] font-semibold text-[#EF4444]">Eliminar cuenta</span>
        </button>
      </div>

      <div className="h-6" />
    </div>
  );
}
