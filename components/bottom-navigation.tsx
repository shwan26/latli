"use client"

import Link from "next/link"
import {
  IconBuildingStore,
  IconChartBar,
  IconDots,
  IconPackage,
  IconUsers,
} from "@tabler/icons-react"
import { useI18n } from "@/lib/i18n/provider"

type BottomNavigationProps = {
  active: "dashboard" | "orders" | "shops" | "customers" | "more"
}

export function BottomNavigation({ active }: BottomNavigationProps) {
  const { t } = useI18n()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pb-4 pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        <BottomNavItem
          href="/dashboard"
          label={t("Dashboard")}
          active={active === "dashboard"}
        >
          <IconChartBar className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/orders" label={t("Orders")} active={active === "orders"}>
          <IconPackage className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/shops" label={t("Shops")} active={active === "shops"}>
          <IconBuildingStore className="size-5" />
        </BottomNavItem>

        <BottomNavItem
          href="/customers"
          label={t("Customers")}
          active={active === "customers"}
        >
          <IconUsers className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/more" label={t("More")} active={active === "more"}>
          <IconDots className="size-5" />
        </BottomNavItem>
      </div>
    </nav>
  )
}

function BottomNavItem({
  href,
  label,
  active,
  children,
}: {
  href: string
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex flex-col items-center gap-1 rounded-xl bg-primary px-2 py-2 text-primary-foreground"
          : "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-muted-foreground"
      }
    >
      {children}
      <span className="text-[11px] leading-none">{label}</span>
    </Link>
  )
}
