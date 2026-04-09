"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SAVED_PROFILES_STORAGE_KEY,
  SAVED_PROFILES_UPDATED_EVENT,
  type SavedProfileItem,
} from "@/lib/saved-profiles";

type SaveProfileButtonProps = {
  item: Omit<SavedProfileItem, "savedAt">;
  className?: string;
};

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

export function SaveProfileButton({
  item,
  className = "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-[#F9FAFB] px-4 text-[15px] font-semibold text-[#1D2939] transition hover:bg-[#F3F4F6]",
}: SaveProfileButtonProps) {
  const [savedItems, setSavedItems] = useState<SavedProfileItem[]>([]);

  useEffect(() => {
    setSavedItems(readSavedProfiles());

    const onUpdated = () => {
      setSavedItems(readSavedProfiles());
    };

    window.addEventListener(SAVED_PROFILES_UPDATED_EVENT, onUpdated);
    window.addEventListener("storage", onUpdated);

    return () => {
      window.removeEventListener(SAVED_PROFILES_UPDATED_EVENT, onUpdated);
      window.removeEventListener("storage", onUpdated);
    };
  }, []);

  const isSaved = useMemo(
    () => savedItems.some((saved) => saved.id === item.id),
    [item.id, savedItems],
  );

  function toggleSave() {
    const current = readSavedProfiles();

    if (current.some((saved) => saved.id === item.id)) {
      writeSavedProfiles(current.filter((saved) => saved.id !== item.id));
      return;
    }

    const next: SavedProfileItem = {
      ...item,
      savedAt: new Date().toISOString(),
    };

    writeSavedProfiles([next, ...current.filter((saved) => saved.id !== item.id)].slice(0, 120));
  }

  return (
    <button type="button" onClick={toggleSave} className={className} aria-pressed={isSaved}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="#111827" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 4h12v16l-6-3-6 3V4Z" fill={isSaved ? "#111827" : "#FFFFFF"} />
      </svg>
      {isSaved ? "Guardado" : "Guardar"}
    </button>
  );
}
