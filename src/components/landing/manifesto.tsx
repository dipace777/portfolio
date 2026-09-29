import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import type { MotionValue } from "motion/react"

const text =
  "Everyone is using AI. Few are *engineering* it. I build agentic systems that *fail gracefully,* *explain themselves* and *scale* without drama — software where the model is a component, not a miracle."

function Word({
  word,
  progress,
  range,
}: {
  word: string
  progress: MotionValue<number>
  range: [number, number]
}) {
  const accent = word.startsWith("*")
  const clean = word.replaceAll("*", "")
  const opacity = useTransform(progress, range, [0.12, 1])
  const blur = useTransform(progress, range, ["blur(6px)", "blur(0px)"])
  return (
    <motion.span
      style={{ opacity, filter: blur }}
      className={`mr-[0.25em] inline-block ${accent ? "font-display text-ember-soft italic" : ""}`}
    >
      {clean}
    </motion.span>
  )
}

export function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"],
  })
  const words = text.split(" ")

  return (
    <section className="relative bg-ink px-6 py-40 md:px-10 md:py-56">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-14 flex items-center gap-4 font-mono text-[11px] tracking-[0.3em] text-bone/40 uppercase">
          <span className="h-px w-10 bg-bone/30" />
          Scene 02 — The thesis
        </div>
        <p
          ref={ref}
          className="max-w-6xl text-[clamp(2rem,4.6vw,4.4rem)] leading-[1.12] font-light tracking-[-0.02em] text-bone"
        >
          <span className="sr-only">{text.replaceAll("*", "")}</span>
          <span aria-hidden>
            {words.map((w, i) => (
              <Word
                key={i}
                word={w}
                progress={scrollYProgress}
                range={[i / words.length, (i + 1) / words.length]}
              />
            ))}
          </span>
        </p>
      </div>
    </section>
  )
}
