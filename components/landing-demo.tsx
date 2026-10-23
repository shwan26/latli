"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { LandingPhonePreview } from "@/components/landing-phone-preview"
import {
  PreviewBottomNav,
  PreviewCreateOrder,
  PreviewData,
  PreviewDashboard,
  PreviewOrders,
  type PreviewNavKey,
} from "@/components/landing-preview-parts"
import { LandingTabletPreview } from "@/components/landing-tablet-preview"
import { useI18n } from "@/lib/i18n/provider"

type T = ReturnType<typeof useI18n>["t"]

const HOLD_MS = 1200
const SCROLL_MS = 3200
const END_HOLD_MS = 1400

const STEPS: {
  id: string
  nav: PreviewNavKey
  title: string
  description: string
  render: (t: T, wide: boolean) => ReactNode
}[] = [
  {
    id: "dashboard",
    nav: "dashboard",
    title: "See your month",
    description:
      "Your to-do list shows what to buy today, and the chart shows your sales and profit.",
    render: (t, wide) => <PreviewDashboard t={t} wide={wide} />,
  },
  {
    id: "orders",
    nav: "orders",
    title: "Track every order",
    description: "Search orders and see who paid, what is bought and what is with cargo.",
    render: (t) => <PreviewOrders t={t} />,
  },
  {
    id: "create",
    nav: "add",
    title: "Add an order in seconds",
    description: "Add a chat screenshot and the details are filled in for you.",
    render: (t) => <PreviewCreateOrder t={t} />,
  },
  {
    id: "data",
    nav: "data",
    title: "Keep shops and customers together",
    description: "Your shops, customers and cargo lists are saved in one place.",
    render: (t) => <PreviewData t={t} />,
  },
]

// Slides the page up to show the part below the fold, like a thumb scrolling.
function ScrollScreen({ scrolled, children }: { scrolled: boolean; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  const measure = useCallback(() => {
    if (!viewport.current || !content.current) return
    setOffset(Math.max(0, content.current.scrollHeight - viewport.current.clientHeight))
  }, [])

  useLayoutEffect(() => {
    measure()
    // The chart sizes itself after the first paint.
    const timer = window.setTimeout(measure, 300)

    return () => window.clearTimeout(timer)
  }, [measure, children])

  return (
    <div ref={viewport} className="absolute inset-0 overflow-hidden">
      <div
        ref={content}
        className="ease-in-out will-change-transform"
        style={{
          transform: `translateY(${scrolled ? -offset : 0}px)`,
          transition: `transform ${scrolled ? SCROLL_MS : 400}ms ease-in-out`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Hero demo: a phone (below md) or tablet (md+) that walks through the app,
// with a caption for each page.
export function LandingDemo() {
  const { t } = useI18n()
  const root = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [scrolledStep, setScrolledStep] = useState(-1)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduceMotion(query.matches)

    update()
    query.addEventListener("change", update)

    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const node = root.current

    if (!node) return

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (reduceMotion || paused || !visible) return

    const scrollTimer = window.setTimeout(() => setScrolledStep(step), HOLD_MS)
    const nextTimer = window.setTimeout(
      () => setStep((current) => (current + 1) % STEPS.length),
      HOLD_MS + SCROLL_MS + END_HOLD_MS
    )

    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(nextTimer)
    }
  }, [step, paused, visible, reduceMotion])

  const current = STEPS[step]
  const scrolled = scrolledStep === step
  const nav = <PreviewBottomNav active={current.nav} t={t} />
  const screen = (wide: boolean) => (
    <ScrollScreen key={`${current.id}-${wide}`} scrolled={scrolled}>
      {current.render(t, wide)}
    </ScrollScreen>
  )

  return (
    <div
      ref={root}
      className="mx-auto w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex w-full items-end justify-center" aria-hidden>
        <div className="hidden w-full max-w-[560px] md:block">
          <LandingTabletPreview screen={screen(true)} nav={nav} />
        </div>
        <div className="flex w-full justify-center md:hidden">
          <LandingPhonePreview screen={screen(false)} nav={nav} />
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-[560px]">
        <div className="flex gap-2" role="tablist" aria-label={t("App tour")}>
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === step}
              aria-label={t(item.title)}
              onClick={() => setStep(index)}
              className="group h-6 flex-1 cursor-pointer"
            >
              <span
                className={`block h-1.5 rounded-full transition-colors ${
                  index === step ? "bg-[#184f3b]" : "bg-[#ded6c9] group-hover:bg-[#c9bfae]"
                }`}
              />
            </button>
          ))}
        </div>
        <div aria-live="polite" className="mt-2 text-center">
          <p className="font-heading text-lg font-medium text-[#171512]">{t(current.title)}</p>
          <p className="mt-1 text-sm leading-6 text-[#605848]">{t(current.description)}</p>
        </div>
      </div>
    </div>
  )
}
