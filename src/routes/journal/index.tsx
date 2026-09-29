import { createFileRoute } from "@tanstack/react-router"
import { motion } from "motion/react"
import { Atmosphere, ScrollProgress } from "@/components/landing/atmosphere"
import { Nav } from "@/components/landing/nav"
import { Credits } from "@/components/landing/credits"
import { EssayRow } from "@/components/journal/essay-row"
import { pageHead } from "@/lib/seo"
import { essays, site } from "@/lib/site"

export const Route = createFileRoute("/journal/")({
  head: () =>
    pageHead({
      title: `Journal — ${site.name}`,
      description:
        "Interactive essays on building AI-native software: durable agents, generative UI, LLM observability and fault-tolerant architecture.",
      path: "/journal",
    }),
  component: JournalIndex,
})

const ease = [0.22, 1, 0.36, 1] as const

function JournalIndex() {
  const live = essays.filter((e) => e.to).length
  return (
    <div className="relative bg-ink text-bone antialiased">
      <Atmosphere />
      <ScrollProgress />
      <Nav home={false} />
      <main className="relative isolate overflow-hidden">
        <img
          src="/images/monolith.webp"
          alt=""
          className="absolute top-0 right-0 -z-10 h-[80svh] w-full [mask-image:linear-gradient(to_bottom,black,transparent)] object-cover object-[75%_35%] opacity-45"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-[80svh] bg-gradient-to-r from-ink via-ink/70 to-transparent"
        />
        <div className="mx-auto max-w-[1400px] px-6 pt-40 pb-32 md:px-10 md:pt-52">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="flex items-center gap-4 font-mono text-[11px] tracking-[0.3em] text-bone/40 uppercase"
          >
            <span className="h-px w-10 bg-bone/30" />
            The journal
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.1, ease }}
            className="mt-6 max-w-4xl font-display text-[clamp(3.5rem,10vw,9rem)] leading-[0.9] tracking-[-0.025em]"
          >
            Essays you can <span className="text-ember-soft italic">run.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.25, ease }}
            className="mt-8 max-w-xl text-lg leading-relaxed text-bone/60"
          >
            Long-form, interactive notes from building agentic systems in
            production. Every diagram is live code: drag it, break it, crash it.
          </motion.p>

          <div className="mt-28 flex items-center justify-between border-b border-bone/10 pb-4 font-mono text-[10px] tracking-[0.3em] text-bone/40 uppercase">
            <span>
              {live} published · {essays.length - live} in the edit
            </span>
            <span>Newest first</span>
          </div>
          <ul>
            {essays.map((e, i) => (
              <EssayRow key={e.no} essay={e} index={i} />
            ))}
          </ul>
        </div>
      </main>
      <Credits />
    </div>
  )
}
