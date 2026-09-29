import { motion } from "motion/react"
import { ArrowUpRight } from "lucide-react"
import { site } from "@/lib/site"

const credits = [
  ["Directed by", "Dipesh Chaulagain"],
  ["Written in", "TypeScript"],
  ["Effects by", "Effect TS"],
  ["Dialogue by", "AI SDK"],
  ["Routing by", "TanStack Start"],
  ["Stunts by", "Go & Elixir"],
  ["Filmed on location", "Kathmandu, Nepal"],
] as const

export function Credits() {
  return (
    <footer
      id="contact"
      className="relative overflow-hidden bg-ink px-6 pt-32 pb-12 md:px-10 md:pt-44"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[36rem] w-[70rem] -translate-x-1/2 rounded-full bg-ember/15 blur-[160px]"
      />
      <div className="relative mx-auto max-w-[1400px]">
        <div className="mb-8 flex items-center gap-4 font-mono text-[11px] tracking-[0.3em] text-bone/40 uppercase">
          <span className="h-px w-10 bg-bone/30" />
          Final scene
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[clamp(3.2rem,10vw,10rem)] leading-[0.88] tracking-[-0.03em] text-bone"
        >
          Let&apos;s build something
          <br />
          <span className="bg-gradient-to-r from-ember-soft via-ember to-glacier bg-clip-text text-transparent italic">
            that thinks.
          </span>
        </motion.h2>

        <div className="mt-14 flex flex-wrap items-center gap-4">
          <a
            href={`mailto:${site.email}`}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-bone px-8 py-5 text-base font-medium text-ink"
          >
            <span className="absolute inset-0 -translate-x-full bg-ember transition-transform duration-500 ease-out group-hover:translate-x-0" />
            <span className="relative">{site.email}</span>
            <ArrowUpRight className="relative size-5 transition-transform group-hover:rotate-45" />
          </a>
          {site.socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-bone/15 px-6 py-5 font-mono text-[11px] tracking-[0.2em] text-bone/60 uppercase transition-colors hover:border-bone/40 hover:text-bone"
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="mt-32 grid gap-y-3 border-t border-bone/10 pt-14 md:grid-cols-2">
          {credits.map(([role, who], i) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.07 }}
              className="grid grid-cols-2 gap-6 md:col-span-2 md:mx-auto md:w-[36rem]"
            >
              <span className="text-right font-mono text-[11px] tracking-[0.25em] text-bone/35 uppercase">
                {role}
              </span>
              <span className="font-display text-xl text-bone/85">{who}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 flex flex-col items-center justify-between gap-4 font-mono text-[10px] tracking-[0.3em] text-bone/30 uppercase md:flex-row">
          <span>© {new Date().getFullYear()} Dipesh Chaulagain</span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-glacier shadow-[0_0_8px_var(--color-glacier)]" />
            All agents nominal
          </span>
          <a href="#top" className="transition-colors hover:text-bone">
            Back to opening ↑
          </a>
        </div>
      </div>
    </footer>
  )
}
