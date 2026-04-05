"use client";

import { useActionState } from "react";

import {
  loginAction,
  registerAction,
  type AuthFormState,
} from "@/lib/auth/actions";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
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

export function AuthForm({ mode }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "login" ? loginAction : registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {state.error}
        </div>
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
        disabled={pending}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#FF6B6B] px-6 text-base font-semibold text-white shadow-[0_18px_40px_rgba(255,107,107,0.28)] transition hover:bg-[#ff5b5b] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Procesando..." : copy[mode].button}
      </button>
    </form>
  );
}