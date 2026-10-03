import type { LocalCargoCompany } from "@/app/lib/local-shops"

import { check, fetchAllRows, getDb } from "./shared"

type CargoRow = {
  id: string
  name: string
  phone: string
  location: string
  note: string
  created_at: string
  updated_at: string
}

export type CargoInput = {
  name: string
  phone: string
  location: string
  note: string
  createdAt?: string
}

function fromRow(row: CargoRow): LocalCargoCompany {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    location: row.location,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listCargo() {
  const rows = await fetchAllRows<CargoRow>(
    "Could not load cargo companies",
    (from, to) =>
      getDb()
        .from("cargo_companies")
        .select("*")
        .order("created_at", { ascending: true })
        .range(from, to)
  )

  return rows.map(fromRow)
}

export async function countCargo() {
  const { count, error } = await getDb()
    .from("cargo_companies")
    .select("id", { count: "exact", head: true })

  check(error, "Could not load cargo companies")

  return count ?? 0
}

export async function insertCargo(company: CargoInput) {
  const { data, error } = await getDb()
    .from("cargo_companies")
    .insert({
      name: company.name,
      phone: company.phone,
      location: company.location,
      note: company.note,
      ...(company.createdAt ? { created_at: company.createdAt } : {}),
    })
    .select("*")
    .single<CargoRow>()

  check(error, "Could not save the cargo company")

  return fromRow(data!)
}
