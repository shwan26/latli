import type { ReactNode } from "react"

// Tablet frame for the landing demo: the same app on a wider screen.
export function LandingTabletPreview({ screen, nav }: { screen: ReactNode; nav: ReactNode }) {
  return (
    <div className="relative w-full max-w-[560px]">
      <div className="absolute inset-x-6 bottom-0 top-6 rounded-[2rem] bg-[#171512]/15 blur-2xl" />
      <div className="relative rounded-[2rem] border-[10px] border-[#171512] bg-[#171512] shadow-2xl shadow-[#3d2c16]/25">
        <div className="overflow-hidden rounded-[1.4rem] bg-muted">
          <div className="relative h-[420px] overflow-hidden">{screen}</div>
          {nav}
        </div>
      </div>
    </div>
  )
}
