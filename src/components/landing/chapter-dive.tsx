import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ArrowRight, X } from "lucide-react"
import { chapters } from "@/lib/site"
import type { Chapter } from "@/lib/site"

const ease = [0.76, 0, 0.24, 1] as const
const FULL = "inset(0px 0px 0px 0px round 0px)"

export function rectToClip(rect: DOMRect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const onScreen =
    rect.right > 0 && rect.left < vw && rect.bottom > 0 && rect.top < vh
  if (!onScreen) {
    return `inset(${vh / 2}px ${vw / 2}px ${vh / 2}px ${vw / 2}px round 6px)`
  }
  return `inset(${rect.top}px ${vw - rect.right}px ${vh - rect.bottom}px ${rect.left}px round 6px)`
}

type Props = {
  index: number
  from: string
  onIndexChange: (index: number) => void
  getClip: (index: number) => string
  onClosed: () => void
}

export function ChapterDive({
  index,
  from,
  onIndexChange,
  getClip,
  onClosed,
}: Props) {
  const [closing, setClosing] = useState<string | null>(null)
  const [direction, setDirection] = useState(1)
  const [switched, setSwitched] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const chapter = chapters[index]
  const delay = (base: number) => (step: number) =>
    (switched ? 0.1 : base) + step * 0.08

  const close = () => setClosing((c) => c ?? getClip(index))
  const go = (delta: number) => {
    const next = index + delta
    if (next < 0 || next >= chapters.length) return
    setDirection(delta)
    setSwitched(true)
    onIndexChange(next)
  }

  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      html.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${chapter.title} — ${chapter.company}`}
      className="fixed inset-0 z-[55]"
    >
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 0.7 }}
        transition={{ duration: 0.6 }}
      />

      <motion.div
        className="absolute inset-0 overflow-hidden bg-[#0a0b0d]"
        initial={{ clipPath: from }}
        animate={{ clipPath: closing ?? FULL }}
        transition={{ duration: closing ? 0.8 : 1.05, ease }}
        onAnimationComplete={() => {
          if (closing) onClosed()
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={chapter.no}
            aria-hidden
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br ${chapter.hue} to-transparent`}
              initial={{ scale: 1.35 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at 85% 15%, color-mix(in oklab, ${chapter.accent} 28%, transparent), transparent 60%)`,
              }}
            />
            <div className="absolute inset-0 [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px] opacity-[0.06]" />
            <motion.span
              className="text-stroke absolute -right-[4vw] -bottom-[14vw] font-display text-[48vw] leading-none"
              initial={{ scale: 1.25, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {chapter.no}
            </motion.span>
          </motion.div>
        </AnimatePresence>

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          style={{
            background: `radial-gradient(ellipse at 30% 40%, ${chapter.accent}, transparent 60%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : [0, 0.55, 0] }}
          transition={{ duration: 1.2, times: [0, 0.35, 1] }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0b0d]/90 via-[#0a0b0d]/40 to-transparent"
        />

        <motion.div
          className="relative flex h-full flex-col overflow-y-auto"
          animate={{ opacity: closing ? 0 : 1 }}
          transition={{ duration: 0.25 }}
        >
          <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="sticky top-0 z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-6 font-mono text-[10px] tracking-[0.3em] text-bone/50 uppercase md:px-10"
          >
            <span>
              Scene 04 · Ch. {chapter.no} · Take {index + 1}
            </span>
            <span className="hidden sm:inline">{chapter.period}</span>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="group flex items-center gap-3 rounded-full border border-bone/15 bg-black/30 py-2 pr-2 pl-4 text-bone/70 backdrop-blur transition-colors hover:border-bone/40 hover:text-bone"
            >
              Close
              <span className="flex size-7 items-center justify-center rounded-full bg-bone/10 transition-transform group-hover:rotate-90">
                <X className="size-3.5" />
              </span>
            </button>
          </motion.header>

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={chapter.no}
              custom={direction}
              variants={{
                enter: (d: number) => ({
                  opacity: 0,
                  x: d * 60,
                  filter: "blur(10px)",
                }),
                center: { opacity: 1, x: 0, filter: "blur(0px)" },
                exit: (d: number) => ({
                  opacity: 0,
                  x: d * -60,
                  filter: "blur(10px)",
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto grid w-full max-w-[1400px] flex-1 content-center gap-14 px-6 py-10 md:px-10 lg:grid-cols-[1.15fr_1fr] lg:gap-20"
            >
              <ChapterIntro chapter={chapter} d={delay(0.55)} />
              <ShotList chapter={chapter} d={delay(0.8)} />
            </motion.div>
          </AnimatePresence>

          <motion.footer
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-6 py-6 font-mono text-[10px] tracking-[0.25em] text-bone/50 uppercase md:px-10"
          >
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="group flex items-center gap-3 transition-colors hover:text-bone disabled:pointer-events-none disabled:opacity-25"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              <span className="hidden sm:inline">
                {index > 0 ? chapters[index - 1].title : "Start"}
              </span>
            </button>

            <div className="flex items-center gap-2">
              {chapters.map((c, i) => (
                <button
                  key={c.no}
                  type="button"
                  aria-label={`Go to ${c.title}`}
                  onClick={() => go(i - index)}
                  className="relative h-1 w-8 overflow-hidden rounded-full bg-bone/15"
                >
                  {i === index && (
                    <motion.span
                      layoutId="dive-dot"
                      className="absolute inset-0 rounded-full"
                      style={{ background: chapter.accent }}
                    />
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => go(1)}
              disabled={index === chapters.length - 1}
              className="group flex items-center gap-3 transition-colors hover:text-bone disabled:pointer-events-none disabled:opacity-25"
            >
              <span className="hidden sm:inline">
                {index < chapters.length - 1
                  ? chapters[index + 1].title
                  : "End"}
              </span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.footer>
        </motion.div>
      </motion.div>
    </div>,
    document.body
  )
}

function rise(delay: number) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as const },
  }
}

type SectionProps = { chapter: Chapter; d: (step: number) => number }

function ChapterIntro({ chapter, d }: SectionProps) {
  return (
    <div>
      <motion.div
        {...rise(d(0))}
        className="flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-[0.25em] uppercase"
      >
        <span style={{ color: chapter.accent }}>{chapter.company}</span>
        <span className="h-px w-6 bg-bone/25" />
        <span className="text-bone/50">{chapter.role}</span>
      </motion.div>

      <h2 className="mt-6 overflow-hidden pb-[0.12em] font-display text-[clamp(3.6rem,9vw,9rem)] leading-[0.9] tracking-[-0.02em] text-bone">
        <motion.span
          className="block"
          initial={{ y: "105%" }}
          animate={{ y: "0%" }}
          transition={{
            duration: 1.1,
            delay: d(1),
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {chapter.title}
        </motion.span>
      </h2>

      <motion.p
        {...rise(d(2))}
        className="mt-6 max-w-xl text-lg leading-relaxed text-bone/70 md:text-xl"
      >
        {chapter.logline}
      </motion.p>

      <motion.div
        {...rise(d(3))}
        className="mt-12 flex items-end gap-5 border-t border-bone/10 pt-8"
      >
        <span
          className="font-display text-6xl leading-none md:text-7xl"
          style={{ color: chapter.accent }}
        >
          {chapter.metric.value}
        </span>
        <span className="pb-2 font-mono text-[10px] tracking-[0.3em] text-bone/50 uppercase">
          {chapter.metric.label}
        </span>
      </motion.div>
    </div>
  )
}

function ShotList({ chapter, d }: SectionProps) {
  return (
    <div className="lg:pt-10">
      <motion.div
        {...rise(d(0))}
        className="mb-6 font-mono text-[10px] tracking-[0.3em] text-bone/40 uppercase"
      >
        Shot list
      </motion.div>
      <ol className="space-y-px overflow-hidden rounded-xl border border-bone/10">
        {chapter.highlights.map((h, i) => (
          <motion.li
            key={h}
            {...rise(d(i + 1))}
            className="grid grid-cols-[2.5rem_1fr] gap-3 bg-black/35 p-5 backdrop-blur-sm"
          >
            <span className="font-mono text-[11px] text-bone/35">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="leading-relaxed text-bone/80">{h}</span>
          </motion.li>
        ))}
      </ol>
      <motion.ul
        {...rise(d(chapter.highlights.length + 1))}
        className="mt-8 flex flex-wrap gap-2"
      >
        {chapter.stack.map((s) => (
          <li
            key={s}
            className="rounded-full border border-bone/15 bg-black/30 px-3 py-1.5 font-mono text-[10px] tracking-wider text-bone/70 uppercase"
          >
            {s}
          </li>
        ))}
      </motion.ul>
    </div>
  )
}
