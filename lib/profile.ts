import type { SupabaseClient } from "@supabase/supabase-js"

import { translate } from "@/lib/i18n/runtime"

export type ProfilePlan = "free" | "pro"
export type ProfileRole = "owner" | "manager" | "staff"
export type ProfileGender = "" | "female" | "male" | "other" | "prefer_not_to_say"

export type ProfileSettings = {
  shopName: string
  ownerName: string
  email: string
  phone: string
  address: string
  age: number | null
  gender: ProfileGender
  plan: ProfilePlan
  role: ProfileRole
}

export const DEFAULT_PROFILE: ProfileSettings = {
  shopName: "Order Manager",
  ownerName: "Owner",
  email: "",
  phone: "",
  address: "",
  age: null,
  gender: "",
  plan: "free",
  role: "owner",
}

// Screenshot reading with Gemini is for managers on the Pro plan. Everyone
// else reads screenshots on the device with Tesseract. The Gemini route checks
// this again on the server, using the plan and role stored in Supabase.
export function canUseGemini(profile: Pick<ProfileSettings, "plan" | "role">) {
  return profile.plan === "pro" && profile.role === "manager"
}

type ProfileRow = {
  shop_name: string
  owner_name: string
  email: string
  phone: string
  address: string
  age: number | null
  gender: Exclude<ProfileGender, ""> | null
  plan: ProfilePlan
  role: ProfileRole
}

// Row level security limits this to the signed-in user's own profile.
export async function fetchProfile(
  supabase: SupabaseClient
): Promise<ProfileSettings | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("shop_name, owner_name, email, phone, address, age, gender, plan, role")
    .maybeSingle<ProfileRow>()

  if (error || !data) return null

  return {
    shopName: data.shop_name,
    ownerName: data.owner_name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    age: data.age,
    gender: data.gender ?? "",
    plan: data.plan,
    role: data.role,
  }
}

// Plan and role are not saved here. The database only lets a user change the
// shop details.
export async function saveProfile(
  supabase: SupabaseClient,
  profile: ProfileSettings
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return translate("You are signed out. Log in again.")

  const { error } = await supabase
    .from("profiles")
    .update({
      shop_name: profile.shopName,
      owner_name: profile.ownerName,
      phone: profile.phone,
      address: profile.address,
      age: profile.age,
      gender: profile.gender || null,
    })
    .eq("id", user.id)

  return error ? error.message : null
}
