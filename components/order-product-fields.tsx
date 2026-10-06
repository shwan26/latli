"use client"

import Image from "next/image"
import { IconCamera } from "@tabler/icons-react"

import { SearchPicker } from "@/components/search-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n/provider"
import type { LocalShopProduct } from "@/app/lib/local-shops"

export type ProductMode = "existing" | "new"

// Saved product / new product choice, plus the optional product photo.
// The saved products are the ones that belong to the chosen shop.
export function OrderProductFields({
  products,
  mode,
  onModeChange,
  productId,
  onPickProduct,
  photoPreview,
  onPhotoChange,
  photoLabel,
}: {
  products: LocalShopProduct[]
  mode: ProductMode
  onModeChange: (mode: ProductMode) => void
  productId: string
  onPickProduct: (product: LocalShopProduct) => void
  photoPreview: string
  onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  photoLabel: string
}) {
  const { t } = useI18n()

  const canPickSaved = products.length > 0
  const showSaved = mode === "existing" && canPickSaved

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={showSaved ? "default" : "outline"}
          className="h-11 rounded-xl"
          aria-pressed={showSaved}
          disabled={!canPickSaved}
          onClick={() => onModeChange("existing")}
        >
          {t("Saved product")}
        </Button>
        <Button
          type="button"
          variant={!showSaved ? "default" : "outline"}
          className="h-11 rounded-xl"
          aria-pressed={!showSaved}
          onClick={() => onModeChange("new")}
        >
          {t("New product")}
        </Button>
      </div>

      {!canPickSaved ? (
        <p className="text-xs text-muted-foreground">
          {t("This shop has no saved products yet. A new product is saved to the shop with this order")}
        </p>
      ) : null}

      {showSaved ? (
        <SearchPicker
          id="productPicker"
          items={products.map((product) => ({
            value: product.id,
            label: product.name,
            description: product.note || undefined,
          }))}
          value={productId}
          onChange={(value) => {
            const product = products.find((item) => item.id === value)

            if (product) onPickProduct(product)
          }}
          placeholder={t("Choose a product")}
          searchPlaceholder={t("Search products")}
          emptyText={t("No saved products match")}
        />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="productPhoto">{photoLabel}</Label>
        <Input
          id="productPhoto"
          type="file"
          accept="image/*"
          className="rounded-xl"
          onChange={onPhotoChange}
        />
      </div>

      {photoPreview ? (
        <div className="overflow-hidden rounded-2xl border bg-background">
          <Image
            src={photoPreview}
            alt={t("Product photo preview")}
            width={800}
            height={800}
            unoptimized
            className="max-h-80 w-full object-contain"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-background p-5 text-center">
          <IconCamera className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t("No product photo selected")}</p>
        </div>
      )}
    </div>
  )
}
