"use client"

import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { IconArrowLeft, IconMapPin, IconPlus, IconTruckDelivery } from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  emptyCargoDraft,
  getLocalCargoCompanies,
  saveLocalCargoCompanies,
  type LocalCargoCompany,
} from "../lib/local-shops"

type CargoDraft = typeof emptyCargoDraft

export default function CargoPage() {
  const [mounted, setMounted] = useState(false)
  const [companies, setCompanies] = useState<LocalCargoCompany[]>([])
  const [draft, setDraft] = useState<CargoDraft>(emptyCargoDraft)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const loadCargo = window.setTimeout(() => {
      setCompanies(getLocalCargoCompanies())
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(loadCargo)
  }, [])

  function updateDraft(key: keyof CargoDraft, value: string) {
    setSaved(false)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleAddCargo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextCompanies = [
      ...companies,
      {
        id: crypto.randomUUID(),
        ...draft,
        name: draft.name.trim(),
        createdAt: new Date().toISOString(),
      },
    ]

    setCompanies(nextCompanies)
    saveLocalCargoCompanies(nextCompanies)
    setDraft(emptyCargoDraft)
    setSaved(true)
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading cargo...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/more" aria-label="Back to more">
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Delivery partners</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Cargo
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        {saved ? (
          <Alert className="rounded-xl">
            <AlertDescription>Cargo company saved.</AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconTruckDelivery className="size-5 text-muted-foreground" />
              Add Cargo
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAddCargo} className="space-y-4">
              <TextInput
                id="cargoName"
                label="Cargo name"
                value={draft.name}
                onChange={(value) => updateDraft("name", value)}
                placeholder="Cargo company"
                required
              />
              <TextInput
                id="cargoPhone"
                label="Phone"
                value={draft.phone}
                onChange={(value) => updateDraft("phone", value)}
                placeholder="Phone number"
                type="tel"
              />
              <div className="space-y-2">
                <Label htmlFor="cargoLocation">Location</Label>
                <Textarea
                  id="cargoLocation"
                  value={draft.location}
                  onChange={(event) => updateDraft("location", event.target.value)}
                  placeholder="Cargo office or drop-off address"
                  className="min-h-24 rounded-xl text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargoNote">Note</Label>
                <Textarea
                  id="cargoNote"
                  value={draft.note}
                  onChange={(event) => updateDraft("note", event.target.value)}
                  placeholder="Fees, cutoff times, or delivery note"
                  className="min-h-24 rounded-xl text-base"
                />
              </div>
              <Button type="submit" className="h-12 w-full rounded-xl">
                <IconPlus className="mr-2 size-5" />
                Add Cargo
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-medium">Saved Cargo</h2>
            <Badge variant="secondary">{companies.length}</Badge>
          </div>

          {companies.length === 0 ? (
            <Card className="rounded-[20px] shadow-none">
              <CardContent className="p-5 text-sm text-muted-foreground">
                No cargo companies saved yet.
              </CardContent>
            </Card>
          ) : (
            companies.map((company) => (
              <Card key={company.id} className="rounded-[20px] shadow-none">
                <CardContent className="space-y-2 p-4">
                  <h3 className="font-heading text-lg font-medium">
                    {company.name}
                  </h3>
                  {company.phone ? (
                    <p className="text-sm text-muted-foreground">{company.phone}</p>
                  ) : null}
                  {company.location ? (
                    <p className="flex items-start gap-1 text-sm text-muted-foreground">
                      <IconMapPin className="mt-0.5 size-4 shrink-0" />
                      <span>{company.location}</span>
                    </p>
                  ) : null}
                  {company.note ? <p className="text-sm">{company.note}</p> : null}
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>

      <BottomNavigation active="more" />
    </main>
  )
}

function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={type === "tel" ? "tel" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-12 rounded-xl text-base"
      />
    </div>
  )
}
