import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"
import { essays } from "@/lib/site"
import { EssayRow } from "@/components/journal/essay-row"

export function Journal() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const imageY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"])

  return (
    <section
      id="journal"
      ref={ref}
      className="relative isolate overflow-hidden bg-ink"
    >
      <div className="relative h-[85svh] min-h-[560px] overflow-hidden">
        <motion.img
          src="/images/monolith.webp"
          alt=""
          loading="lazy"
          style={{ y: imageY }}
          className="absolute inset-0 -z-10 size-full scale-[1.15] object-cover object-[75%_35%] opacity-80"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-ink via-transparent to-ink"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/60 to-transparent"
        />

        <div className="mx-auto flex h-full max-w-[1400px] flex-col justify-center px-6 md:px-10">
          <div className="mb-6 flex items-center gap-4 font-mono text-[11px] tracking-[0.3em] text-bone/40 uppercase">
            <span className="h-px w-10 bg-bone/30" />
            Scene 06 — The journal
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.9] tracking-[-0.02em] text-bone"
          >
            Essays you can <span className="text-ember-soft italic">run.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{
              duration: 1.2,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-8 max-w-lg text-lg leading-relaxed text-bone/65"
          >
            Interactive, deeply-researched articles on building AI-native
            features with modern tools — live code, playable diagrams and real
            traces. High signal, zero fluff.
          </motion.p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-32 md:px-10 md:pb-44">
        <div className="flex items-center justify-between border-b border-bone/10 pb-4 font-mono text-[10px] tracking-[0.3em] text-bone/40 uppercase">
          <span>Latest</span>
          <span>{essays.length} essays</span>
        </div>
        <ul>
          {essays.map((e, i) => (
            <EssayRow key={e.no} essay={e} index={i} />
          ))}
        </ul>
        <Link
          to="/journal"
          className="group mt-10 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-bone/55 uppercase transition-colors hover:text-bone"
        >
          Enter the journal
          <ArrowUpRight className="size-4 transition-transform group-hover:rotate-45" />
        </Link>
      </div>
    </section>
  )
}
