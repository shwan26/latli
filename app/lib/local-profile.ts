import { LOCAL_STORAGE_KEYS } from "./local-storage-keys"

export type ProfileSettings = {
  shopName: string
  ownerName: string
  email: string
  phone: string
  address: string
}

export const DEFAULT_PROFILE: ProfileSettings = {
  shopName: "Order Manager",
  ownerName: "Owner",
  email: "",
  phone: "",
  address: "",
}

export function getStoredProfile(): ProfileSettings {
  if (typeof window === "undefined") return DEFAULT_PROFILE

  const stored = window.localStorage.getItem(LOCAL_STORAGE_KEYS.settings)

  if (!stored) return DEFAULT_PROFILE

  try {
    return {
      ...DEFAULT_PROFILE,
      ...(JSON.parse(stored) as Partial<ProfileSettings>),
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveStoredProfile(profile: ProfileSettings) {
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.settings, JSON.stringify(profile))
}
