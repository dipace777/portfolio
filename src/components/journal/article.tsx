import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { motion } from "motion/react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import { essays, formatDate, site } from "@/lib/site"
import { Atmosphere, ScrollProgress } from "@/components/landing/atmosphere"
import { Nav } from "@/components/landing/nav"

type Essay = (typeof essays)[number]
export type TocItem = { id: string; title: string }

const ease = [0.22, 1, 0.36, 1] as const

function useActiveSection(ids: ReadonlyArray<string>) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: "-20% 0px -70% 0px" }
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  return active
}

function Toc({ items }: { items: ReadonlyArray<TocItem> }) {
  const active = useActiveSection(items.map((i) => i.id))
  return (
    <nav aria-label="Table of contents" className="sticky top-28">
      <p className="mb-5 font-mono text-[10px] tracking-[0.3em] text-bone/35 uppercase">
        In this essay
      </p>
      <ol className="grid gap-1 border-l border-bone/10">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              className={`-ml-px flex gap-3 border-l py-1.5 pl-4 text-sm leading-snug transition-colors ${
                active === item.id
                  ? "border-ember text-bone"
                  : "border-transparent text-bone/40 hover:text-bone/75"
              }`}
            >
              <span className="font-mono text-[10px] leading-5 text-bone/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function ArticleHeader({ essay }: { essay: Essay }) {
  return (
    <header className="relative isolate px-6 pt-36 pb-20 md:px-10 md:pt-44 md:pb-28">
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -z-10 h-[38rem] w-[70rem] -translate-x-1/2 rounded-full bg-ember/[0.07] blur-[140px]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(237,230,218,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(237,230,218,0.04)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] bg-[size:72px_72px]"
      />
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] tracking-[0.25em] text-bone/45 uppercase"
        >
          <Link
            to="/journal"
            className="group inline-flex items-center gap-2 text-bone/60 transition-colors hover:text-bone"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            Journal
          </Link>
          <span className="h-px w-8 bg-bone/20" />
          <span className="text-ember">{essay.no}</span>
          {essay.published && <span>{formatDate(essay.published)}</span>}
          {essay.minutes && <span>{essay.minutes} min read</span>}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.1, ease }}
          className="mt-10 max-w-5xl font-display text-[clamp(3rem,9vw,8.5rem)] leading-[0.92] tracking-[-0.025em] text-bone"
        >
          {essay.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.25, ease }}
          className="mt-8 max-w-2xl text-xl leading-relaxed text-bone/60"
        >
          {essay.kicker}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.45 }}
          className="mt-10 flex flex-wrap items-center gap-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full border border-bone/20 font-display text-lg text-bone italic">
              d
            </span>
            <div className="leading-tight">
              <p className="text-sm text-bone">{site.name}</p>
              <p className="font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase">
                {site.role}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {essay.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-bone/15 px-3 py-1 font-mono text-[10px] tracking-wider text-bone/60 uppercase"
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </header>
  )
}

function ArticleFooter({ essay }: { essay: Essay }) {
  const next = essays.filter((e) => e.no !== essay.no)
  return (
    <footer className="border-t border-bone/10 px-6 py-24 md:px-10">
      <div className="mx-auto max-w-[1200px]">
        <p className="font-mono text-[10px] tracking-[0.3em] text-bone/35 uppercase">
          Up next in the journal
        </p>
        <ul className="mt-6 grid gap-px overflow-hidden rounded-xl border border-bone/10 bg-bone/10 md:grid-cols-3">
          {next.map((e) => (
            <li key={e.no} className="bg-ink p-6">
              <p className="font-mono text-[10px] tracking-[0.25em] text-bone/35 uppercase">
                {e.no} · {e.to ? "Out now" : "In the edit"}
              </p>
              <p className="mt-3 font-display text-2xl leading-tight text-bone">
                {e.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-bone/45">
                {e.kicker}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-md text-bone/55">
            Building something agentic and want a second pair of eyes?{" "}
            <a
              href={`mailto:${site.email}`}
              className="text-bone underline decoration-ember/60 underline-offset-4 hover:decoration-ember"
            >
              Write to me
            </a>
            .
          </p>
          <div className="flex gap-6">
            {site.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.2em] text-bone/50 uppercase transition-colors hover:text-bone"
              >
                {s.label}
                <ArrowUpRight className="size-3.5 transition-transform group-hover:rotate-45" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export function ArticleShell({
  essay,
  toc,
  children,
}: {
  essay: Essay
  toc: ReadonlyArray<TocItem>
  children: ReactNode
}) {
  return (
    <div className="relative overflow-x-clip bg-ink text-bone antialiased">
      <Atmosphere />
      <ScrollProgress />
      <Nav home={false} />
      <main>
        <ArticleHeader essay={essay} />
        <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-16 px-6 pb-24 md:px-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <Toc items={toc} />
          </aside>
          <article className="article-prose max-w-[46rem]">{children}</article>
        </div>
      </main>
      <ArticleFooter essay={essay} />
    </div>
  )
}

export function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28 pt-16 first:pt-0">
      <h2 className="group font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.015em] text-bone">
        <a href={`#${id}`}>
          {title}
          <span
            aria-hidden
            className="ml-3 font-mono text-base text-ember opacity-0 transition-opacity group-hover:opacity-100"
          >
            #
          </span>
        </a>
      </h2>
      {children}
    </section>
  )
}

export function Callout({
  label = "Note",
  children,
}: {
  label?: string
  children: ReactNode
}) {
  return (
    <aside className="my-10 rounded-xl border border-ember/20 bg-ember/[0.04] px-6 py-5 text-base leading-relaxed">
      <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-ember uppercase">
        {label}
      </p>
      <div className="text-bone/75 [&>*+*]:mt-3">{children}</div>
    </aside>
  )
}

export function Demo({
  label,
  title,
  hint,
  children,
}: {
  label: string
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <figure className="my-12 overflow-hidden rounded-2xl border border-bone/10 bg-[#0a0b0d] text-base leading-normal shadow-[0_40px_120px_-40px_rgba(255,154,60,0.15)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bone/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="animate-flicker size-1.5 rounded-full bg-ember shadow-[0_0_8px_var(--color-ember)]" />
          <span className="font-mono text-[10px] tracking-[0.3em] text-ember uppercase">
            {label}
          </span>
          <span className="font-mono text-[11px] tracking-wider text-bone/60">
            {title}
          </span>
        </div>
        {hint && (
          <span className="font-mono text-[10px] tracking-[0.2em] text-bone/35 uppercase">
            {hint}
          </span>
        )}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </figure>
  )
}
