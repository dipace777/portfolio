import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { Link } from "@tanstack/react-router"

const links = [
  { hash: "principles", label: "Principles" },
  { hash: "reel", label: "Reel" },
  { hash: "stack", label: "Stack" },
  { hash: "journal", label: "Journal" },
]

function Timecode() {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const pad = (n: number) => String(n).padStart(2, "0")
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000
      const frames = Math.floor((elapsed % 1) * 24)
      const s = Math.floor(elapsed)
      if (ref.current) {
        ref.current.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames)}`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <span ref={ref} className="tabular-nums">
      00:00:00:00
    </span>
  )
}

export function Nav({
  ready = true,
  home = true,
}: {
  ready?: boolean
  home?: boolean
}) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={ready ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled ? "border-b border-bone/5 bg-ink/85 backdrop-blur-xl" : ""
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 md:px-10">
        <Link
          to="/"
          hash={home ? "top" : undefined}
          className="group flex items-center gap-3"
        >
          <span className="relative flex size-8 items-center justify-center rounded-full border border-bone/20 font-display text-lg text-bone italic transition-colors group-hover:border-ember/60">
            d
            <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-ember shadow-[0_0_12px_var(--color-ember)]" />
          </span>
          <span className="hidden font-mono text-[11px] tracking-[0.25em] text-bone/70 uppercase sm:block">
            Dipesh Chaulagain
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.hash}>
              <Link
                to={l.hash === "journal" && !home ? "/journal" : "/"}
                hash={l.hash === "journal" && !home ? undefined : l.hash}
                className="font-mono text-[11px] tracking-[0.25em] text-bone/50 uppercase transition-colors hover:text-bone"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-bone/60">
          <span className="animate-flicker size-1.5 rounded-full bg-[#ff4d4d] shadow-[0_0_8px_#ff4d4d]" />
          <span className="hidden sm:inline">REC</span>
          <Timecode />
        </div>
      </nav>
    </motion.header>
  )
}
