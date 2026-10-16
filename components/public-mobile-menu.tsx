"use client"

import Link from "next/link"
import { IconMenu2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

// Hamburger button and side bar of the public navbar, shown on phones only.
// The labels come from the server navbar, already translated.
export function PublicMobileMenu({
  links,
  label,
}: {
  links: { href: string; label: string }[]
  label: string
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={label}
          className="size-9 rounded-lg md:hidden"
        >
          <IconMenu2 className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col px-4">
          {links.map((link) => (
            <SheetClose key={link.href} asChild>
              <Link
                href={link.href}
                className="border-b py-4 text-base font-medium"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
