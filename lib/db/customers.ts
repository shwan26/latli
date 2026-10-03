import type { LocalCustomer } from "@/app/lib/local-customers"

import { check, fetchAllRows, getDb } from "./shared"

type CustomerRow = {
  id: string
  name: string
  facebook_name: string
  phone: string
  address: string
  other_contacts: string
  created_at: string
  updated_at: string
}

export type CustomerInput = Omit<LocalCustomer, "id" | "createdAt" | "updatedAt"> & {
  createdAt?: string
}

function fromRow(row: CustomerRow): LocalCustomer {
  return {
    id: row.id,
    name: row.name,
    facebookName: row.facebook_name,
    phone: row.phone,
    address: row.address,
    otherContacts: row.other_contacts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toColumns(customer: CustomerInput) {
  return {
    name: customer.name,
    facebook_name: customer.facebookName,
    phone: customer.phone,
    address: customer.address,
    other_contacts: customer.otherContacts,
  }
}

export async function listCustomers() {
  const rows = await fetchAllRows<CustomerRow>(
    "Could not load customers",
    (from, to) =>
      getDb()
        .from("customers")
        .select("*")
        .order("created_at", { ascending: true })
        .range(from, to)
  )

  return rows.map(fromRow)
}

export async function insertCustomer(customer: CustomerInput) {
  const { data, error } = await getDb()
    .from("customers")
    .insert({
      ...toColumns(customer),
      ...(customer.createdAt ? { created_at: customer.createdAt } : {}),
    })
    .select("*")
    .single<CustomerRow>()

  check(error, "Could not save the customer")

  return fromRow(data!)
}

export async function updateCustomer(id: string, customer: CustomerInput) {
  const { data, error } = await getDb()
    .from("customers")
    .update(toColumns(customer))
    .eq("id", id)
    .select("*")
    .single<CustomerRow>()

  check(error, "Could not save the customer")

  return fromRow(data!)
}

export async function deleteCustomer(id: string) {
  const { error } = await getDb().from("customers").delete().eq("id", id)

  check(error, "Could not delete the customer")
}
