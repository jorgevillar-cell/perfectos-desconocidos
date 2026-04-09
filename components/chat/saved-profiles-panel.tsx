"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  SAVED_PROFILES_STORAGE_KEY,
  SAVED_PROFILES_UPDATED_EVENT,
  type SavedProfileItem,
} from "@/lib/saved-profiles";

function readSavedProfiles() {
  try {
    const raw = localStorage.getItem(SAVED_PROFILES_STORAGE_KEY);
    if (!raw) return [] as SavedProfileItem[];
    const parsed = JSON.parse(raw) as SavedProfileItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [] as SavedProfileItem[];
  }
}

function writeSavedProfiles(items: SavedProfileItem[]) {
  localStorage.setItem(SAVED_PROFILES_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(SAVED_PROFILES_UPDATED_EVENT));
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SavedProfilesPanel({ active }: { active: boolean }) {
  const [items, setItems] = useState<SavedProfileItem[]>([]);

  useEffect(() => {
    if (!active) return;
    setItems(readSavedProfiles());

    const onUpdated = () => {
      setItems(readSavedProfiles());
    };

    window.addEventListener(SAVED_PROFILES_UPDATED_EVENT, onUpdated);
    window.addEventListener("storage", onUpdated);

    return () => {
      window.removeEventListener(SAVED_PROFILES_UPDATED_EVENT, onUpdated);
      window.removeEventListener("storage", onUpdated);
    };
  }, [active]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)),
    [items],
  );

  if (!sorted.length) {
    return (
      <div className="h-[calc(100%-56px)] overflow-y-auto bg-[#FCFCFC] px-4 py-6">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-[14px] text-[#6B7280]">
          Todavia no has guardado perfiles.
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100%-56px)] overflow-y-auto bg-[#FCFCFC] px-4 py-4">
      <p className="mb-3 text-[13px] font-semibold text-[#667085]">Perfiles guardados ({sorted.length})</p>
      <div className="space-y-3">
        {sorted.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <img src={item.photoUrl} alt={item.name} className="h-12 w-12 rounded-xl object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[#1A1A1A]">{item.name}, {item.age}</p>
                <p className="truncate text-[12px] text-[#667085]">{item.zone}, {item.city}</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#F76565]">{formatEuro(item.price)}{item.hasPiso ? "/mes" : " presupuesto"}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/profile/${item.id}`} className="inline-flex h-9 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white text-[12px] font-semibold text-[#334155]">
                Ver perfil
              </Link>
              <button
                type="button"
                onClick={() => writeSavedProfiles(sorted.filter((saved) => saved.id !== item.id))}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[12px] font-semibold text-[#B42318]"
              >
                Quitar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
