import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { ArrowUpRight } from "lucide-react"
import { essays } from "@/lib/site"

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
          src="/images/monolith.jpg"
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
          <span>Now in production</span>
          <span>{essays.length} essays</span>
        </div>
        <ul>
          {essays.map((e, i) => (
            <motion.li
              key={e.no}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{
                duration: 0.9,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group relative border-b border-bone/10"
            >
              <div className="absolute inset-0 origin-bottom scale-y-0 bg-gradient-to-r from-ember/[0.08] to-transparent transition-transform duration-500 ease-out group-hover:scale-y-100" />
              <div className="relative grid cursor-default grid-cols-[3.5rem_1fr_auto] items-center gap-4 py-8 md:grid-cols-[6rem_1fr_14rem_auto] md:gap-8 md:py-10">
                <span className="font-mono text-xs text-bone/35">{e.no}</span>
                <div>
                  <h3 className="font-display text-2xl leading-tight text-bone transition-transform duration-500 group-hover:translate-x-2 md:text-4xl">
                    {e.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone/45 md:text-base">
                    {e.kicker}
                  </p>
                </div>
                <div className="hidden flex-wrap gap-2 md:flex">
                  {e.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-bone/15 px-3 py-1 font-mono text-[10px] tracking-wider text-bone/60 uppercase"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase">
                  <span className="hidden sm:inline">Soon</span>
                  <ArrowUpRight className="size-5 text-bone/40 transition-all duration-500 group-hover:rotate-45 group-hover:text-ember" />
                </span>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
