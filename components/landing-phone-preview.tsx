import type { ReactNode } from "react"

// Phone frame for the landing demo. The screen and bottom nav come from
// LandingDemo, which drives the page changes and scrolling.
export function LandingPhonePreview({ screen, nav }: { screen: ReactNode; nav: ReactNode }) {
  return (
    <div className="relative w-full max-w-[320px] shrink-0">
      <div className="absolute inset-x-5 bottom-0 top-5 rounded-[3rem] bg-[#171512]/15 blur-2xl" />
      <div className="relative rounded-[3rem] border-[8px] border-[#171512] bg-[#171512] p-1.5 shadow-2xl shadow-[#3d2c16]/25">
        <div className="overflow-hidden rounded-[2.35rem] bg-muted">
          <div className="relative flex h-8 items-center justify-center bg-background text-[10px] font-semibold">
            <span>9:41</span>
          </div>
          <div className="relative h-[480px] overflow-hidden">{screen}</div>
          {nav}
        </div>
      </div>
    </div>
  )
}
