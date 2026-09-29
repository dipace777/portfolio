import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { AgentGraph } from "./agent-graph"

const ease = [0.22, 1, 0.36, 1] as const

const stats = [
  { value: "5+", label: "Years shipping" },
  { value: "05", label: "Industries" },
  { value: "∞", label: "Agents in flight" },
]

function SplitWord({
  text,
  ready,
  delay,
  className,
  gradient,
}: {
  text: string
  ready: boolean
  delay: number
  className?: string
  gradient?: [string, string]
}) {
  const chars = text.split("")
  return (
    <span
      className={`-mr-[0.1em] -mb-[0.2em] inline-flex overflow-hidden pr-[0.1em] pb-[0.28em] ${className ?? ""}`}
    >
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block pr-[0.02em]"
          style={
            gradient && {
              color: `color-mix(in oklab, ${gradient[1]} ${(i / (chars.length - 1)) * 100}%, ${gradient[0]})`,
            }
          }
          initial={{ y: "110%", rotate: 6, opacity: 0 }}
          animate={ready ? { y: "0%", rotate: 0, opacity: 1 } : undefined}
          transition={{ duration: 1.1, delay: delay + i * 0.04, ease }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  )
}

export function Hero({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"])
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2])
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const contentScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.97])
  const contentBlur = useTransform(
    scrollYProgress,
    [0, 0.3],
    ["blur(0px)", "blur(6px)"]
  )
  const barHeight = useTransform(scrollYProgress, [0, 0.18], ["7vh", "0vh"])

  return (
    <section
      id="top"
      ref={ref}
      className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink"
    >
      <motion.div
        style={{ y: imageY, scale: imageScale }}
        className="absolute inset-0 -z-20"
      >
        <motion.img
          src="/images/hero-network.webp"
          alt=""
          fetchPriority="high"
          className="size-full object-cover object-[70%_50%]"
          initial={{ scale: 1.25, opacity: 0, filter: "blur(12px)" }}
          animate={
            ready ? { scale: 1, opacity: 0.85, filter: "blur(0px)" } : undefined
          }
          transition={{ duration: 3.2, ease }}
        />
      </motion.div>

      <AgentGraph className="absolute inset-0 -z-10 size-full opacity-80 mix-blend-screen" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/70 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-ink to-transparent"
      />

      <motion.div
        aria-hidden
        style={{ height: barHeight }}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-black"
      />
      <motion.div
        aria-hidden
        style={{ height: barHeight }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black"
      />

      <motion.div
        style={{
          y: contentY,
          opacity: contentOpacity,
          scale: contentScale,
          filter: contentBlur,
        }}
        className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 pt-24 pb-[calc(7vh+1.5rem)] md:px-10"
      >
        <div className="my-auto py-6">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={ready ? { opacity: 1, x: 0 } : undefined}
            transition={{ duration: 1, delay: 0.3, ease }}
            className="mb-6 flex items-center gap-4 font-mono text-[11px] tracking-[0.3em] text-bone/60 uppercase"
          >
            <span className="h-px w-10 bg-ember" />
            Scene 01 — AI-Native Fullstack Developer
          </motion.div>

          <h1 className="font-display text-[clamp(3.5rem,min(13vw,17svh),12.5rem)] leading-[0.86] tracking-[-0.02em] text-bone">
            <SplitWord text="Dipesh" ready={ready} delay={0.4} />
            <br />
            <SplitWord
              text="Chaulagain"
              ready={ready}
              delay={0.65}
              className="italic"
              gradient={["#ffc27a", "#ff6a3c"]}
            />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 1.2, delay: 1.3, ease }}
            className="mt-[min(2.5rem,4svh)] max-w-xl text-lg leading-relaxed text-bone/70 md:text-xl"
          >
            Not just{" "}
            <em className="font-display text-2xl text-bone md:text-[1.6rem]">
              using
            </em>{" "}
            AI — engineering{" "}
            <span className="text-bone">
              resilient, observable and scalable agentic systems
            </span>{" "}
            that hold up in production.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 1.2, delay: 1.5, ease }}
            className="mt-[min(3rem,5svh)] flex flex-wrap items-center gap-4"
          >
            <a
              href="#journal"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-bone px-7 py-4 text-sm font-medium text-ink transition-transform hover:scale-[1.02]"
            >
              <span className="absolute inset-0 -translate-x-full bg-ember transition-transform duration-500 ease-out group-hover:translate-x-0" />
              <span className="relative">Read the journal</span>
              <ArrowUpRight className="relative size-4 transition-transform group-hover:rotate-45" />
            </a>
            <a
              href="#reel"
              className="group inline-flex items-center gap-3 rounded-full border border-bone/20 px-7 py-4 text-sm text-bone/80 backdrop-blur-sm transition-colors hover:border-bone/50 hover:text-bone"
            >
              Watch the reel
              <ArrowDownRight className="size-4 transition-transform group-hover:translate-y-0.5" />
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1.2, delay: 1.8, ease }}
          className="hidden items-end justify-between border-t border-bone/10 pt-6 md:flex"
        >
          <dl className="flex gap-14">
            {stats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-3">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl leading-none text-bone">
                  {s.value}
                </dd>
                <span
                  aria-hidden
                  className="font-mono text-[10px] tracking-[0.25em] text-bone/40 uppercase"
                >
                  {s.label}
                </span>
              </div>
            ))}
          </dl>
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] text-bone/40 uppercase">
            Scroll
            <span className="relative h-8 w-px overflow-hidden bg-bone/15">
              <motion.span
                className="absolute inset-x-0 top-0 h-1/2 bg-ember"
                animate={{ y: ["-100%", "200%"] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
