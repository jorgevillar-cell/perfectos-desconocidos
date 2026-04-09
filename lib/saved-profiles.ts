export type SavedProfileItem = {
  id: string;
  name: string;
  age: number;
  city: string;
  zone: string;
  photoUrl: string;
  hasPiso: boolean;
  price: number;
  savedAt: string;
};

export const SAVED_PROFILES_STORAGE_KEY = "pd-saved-profiles-v1";
export const SAVED_PROFILES_UPDATED_EVENT = "pd:saved-profiles-updated";
