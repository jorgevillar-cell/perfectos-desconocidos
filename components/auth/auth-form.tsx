"use client";

import { useActionState, useState } from "react";

import {
  loginAction,
  registerAction,
  type AuthFormState,
} from "@/lib/auth/actions";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
  nextPath?: string | null;
};

const initialState: AuthFormState = {
  error: null,
};

const copy = {
  login: {
    button: "Entrar",
    helper: "Accede con tu cuenta para explorar perfiles y pisos.",
  },
  register: {
    button: "Crear cuenta",
    helper: "Crea tu acceso y continúa directamente al onboarding.",
  },
} as const;

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const [userType, setUserType] = useState<"propietario" | "buscador" | null>(null);
  const [state, formAction, pending] = useActionState(
    mode === "login" ? loginAction : registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={nextPath ?? ""} />
      {mode === "register" ? <input type="hidden" name="userType" value={userType ?? ""} /> : null}
      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {state.error}
        </div>
      ) : null}

      {mode === "register" ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-800">Que describe mejor tu situacion?</h2>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setUserType("propietario")}
              className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold transition ${
                userType === "propietario"
                  ? "border-[#FF6B6B] bg-[#FFF1F1] text-[#B35C52]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#B35C52]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 11.5 12 4l9 7.5" />
                  <path d="M5 10v9h14v-9" />
                </svg>
              </span>
              Tengo un piso y busco companero
            </button>

            <button
              type="button"
              onClick={() => setUserType("buscador")}
              className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold transition ${
                userType === "buscador"
                  ? "border-[#FF6B6B] bg-[#FFF1F1] text-[#B35C52]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#B35C52]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              Busco piso o companeros
            </button>
          </div>
        </section>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
          className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-[#FF6B6B] focus:ring-4 focus:ring-[#FF6B6B]/12"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-semibold text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-[#FF6B6B] focus:ring-4 focus:ring-[#FF6B6B]/12"
        />
      </div>

      <p className="text-sm leading-6 text-slate-500">
        {copy[mode].helper}
      </p>

      <button
        type="submit"
        disabled={pending || (mode === "register" && !userType)}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#FF6B6B] px-6 text-base font-semibold text-white shadow-[0_18px_40px_rgba(255,107,107,0.28)] transition hover:bg-[#ff5b5b] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Procesando..." : copy[mode].button}
      </button>
    </form>
  );
}