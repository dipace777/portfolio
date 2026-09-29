import { useLayoutEffect, useRef, useState } from "react"
import { motion, useScroll, useSpring, useTransform } from "motion/react"
import { ArrowUpRight } from "lucide-react"
import { chapters } from "@/lib/site"
import type { Chapter } from "@/lib/site"
import { ChapterDive, rectToClip } from "./chapter-dive"

function Sprockets() {
  return (
    <div aria-hidden className="flex justify-between px-3">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="h-2.5 w-4 rounded-[3px] bg-ink" />
      ))}
    </div>
  )
}

function ChapterCard({
  chapter,
  index,
  frameRef,
  onOpen,
  hidden,
}: {
  chapter: Chapter
  index: number
  frameRef: (el: HTMLDivElement | null) => void
  onOpen: () => void
  hidden: boolean
}) {
  return (
    <article className="group relative flex h-[min(68vh,560px)] w-[82vw] shrink-0 flex-col rounded-md bg-[#15171a] py-2.5 transition-transform duration-700 ease-out hover:-translate-y-1.5 sm:w-[30rem] md:w-[34rem]">
      <Sprockets />
      <div
        ref={frameRef}
        className={`relative mx-2.5 my-2.5 flex flex-1 flex-col justify-between overflow-hidden rounded-sm bg-[#0a0b0d] p-7 transition-opacity duration-300 md:p-9 ${
          hidden ? "opacity-0" : ""
        }`}
      >
        <div
          aria-hidden
          className={`absolute inset-0 bg-gradient-to-br ${chapter.hue} to-transparent opacity-60 transition-all duration-1000 group-hover:scale-110 group-hover:opacity-100`}
        />
        <div
          aria-hidden
          className="absolute inset-0 [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.07]"
        />
        <span
          aria-hidden
          className="text-stroke pointer-events-none absolute -right-4 -bottom-16 font-display text-[16rem] leading-none transition-transform duration-700 group-hover:-translate-y-4"
        >
          {chapter.no}
        </span>

        <div className="relative flex items-center justify-between font-mono text-[10px] tracking-[0.3em] text-bone/50 uppercase">
          <span>Ch. {chapter.no}</span>
          <span className="relative">
            <span className="transition-opacity duration-300 group-hover:opacity-0">
              Take {index + 1}
            </span>
            <span
              className="absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-2 rounded-full border border-bone/25 bg-black/40 px-3 py-1.5 whitespace-nowrap text-bone opacity-0 backdrop-blur transition-all duration-300 group-hover:opacity-100"
              aria-hidden
            >
              Enter scene
              <ArrowUpRight className="size-3" />
            </span>
          </span>
        </div>

        <div className="relative">
          <div className="mb-4 font-mono text-[10px] tracking-[0.25em] uppercase">
            <span style={{ color: chapter.accent }}>{chapter.company}</span>
            <span className="text-bone/40"> · {chapter.period}</span>
          </div>
          <h3 className="font-display text-5xl leading-none text-bone md:text-6xl">
            {chapter.title}
          </h3>
          <p className="mt-5 max-w-sm leading-relaxed text-bone/65">
            {chapter.logline}
          </p>
          <ul className="mt-7 flex flex-wrap gap-2">
            {chapter.tags.map((t) => (
              <li
                key={t}
                className="rounded-full border border-bone/15 bg-black/30 px-3 py-1 font-mono text-[10px] tracking-wider text-bone/70 uppercase backdrop-blur"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${chapter.title} at ${chapter.company}`}
          className="absolute inset-0 z-10 cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:outline-none"
        />
      </div>
      <Sprockets />
    </article>
  )
}

export function Reel() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const frames = useRef<Array<HTMLDivElement | null>>([])
  const [distance, setDistance] = useState(0)
  const [dive, setDive] = useState<{ index: number; from: string } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current
      if (track) setDistance(Math.max(0, track.scrollWidth - window.innerWidth))
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const clipFor = (index: number) => {
    const el = frames.current[index]
    return el
      ? rectToClip(el.getBoundingClientRect())
      : rectToClip(new DOMRect(-1, -1, 0, 0))
  }

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  })
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.4,
  })
  const x = useTransform(smooth, [0, 1], [0, -distance])
  const progress = useTransform(smooth, [0, 1], ["0%", "100%"])

  return (
    <section id="reel" ref={sectionRef} className="relative h-[420vh] bg-ink">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden pt-16">
        <div className="mx-auto mb-10 flex w-full max-w-[1400px] items-end justify-between gap-6 px-6 md:px-10">
          <div>
            <div className="mb-6 flex items-center gap-4 font-mono text-[11px] tracking-[0.3em] text-bone/40 uppercase">
              <span className="h-px w-10 bg-bone/30" />
              Scene 04 — The reel
            </div>
            <h2 className="font-display text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.95] tracking-[-0.02em] text-bone">
              Five years.{" "}
              <span className="text-bone/35 italic">Five worlds.</span>
            </h2>
          </div>
          <p className="hidden max-w-xs text-sm leading-relaxed text-bone/50 md:block">
            Fullstack products shipped end-to-end — from database schema to the
            pixel — across industries where the stakes are real.
          </p>
        </div>

        <motion.div
          ref={trackRef}
          style={{ x }}
          className="flex w-max gap-6 px-6 md:px-10"
        >
          {chapters.map((c, i) => (
            <ChapterCard
              key={c.no}
              chapter={c}
              index={i}
              hidden={dive?.index === i}
              frameRef={(el) => {
                frames.current[i] = el
              }}
              onOpen={() => setDive({ index: i, from: clipFor(i) })}
            />
          ))}
          <article className="flex h-[min(68vh,560px)] w-[82vw] shrink-0 flex-col justify-center rounded-md border border-dashed border-bone/15 p-9 sm:w-[30rem] md:w-[34rem]">
            <span className="font-mono text-[10px] tracking-[0.3em] text-ember uppercase">
              Ch. 06 · In production
            </span>
            <h3 className="mt-5 font-display text-5xl leading-none text-bone md:text-6xl">
              AI-native{" "}
              <span className="text-ember-soft italic">everything.</span>
            </h3>
            <p className="mt-5 max-w-sm leading-relaxed text-bone/60">
              Taking everything learned across these worlds and rebuilding it
              around agents that are reliable enough to trust with real work.
            </p>
          </article>
        </motion.div>

        <div className="mx-auto mt-10 flex w-full max-w-[1400px] items-center gap-4 px-6 font-mono text-[10px] tracking-[0.3em] text-bone/40 uppercase md:px-10">
          <span>00</span>
          <div className="relative h-px flex-1 bg-bone/10">
            <motion.div
              style={{ width: progress }}
              className="absolute inset-y-0 left-0 bg-ember"
            />
          </div>
          <span>06</span>
        </div>
      </div>

      {dive && (
        <ChapterDive
          index={dive.index}
          from={dive.from}
          onIndexChange={(index) => setDive((d) => d && { ...d, index })}
          getClip={clipFor}
          onClosed={() => setDive(null)}
        />
      )}
    </section>
  )
}
