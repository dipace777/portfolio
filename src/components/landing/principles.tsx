import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useInView } from "motion/react"
import { Activity, Network, ShieldCheck } from "lucide-react"

type Status = "ok" | "error" | "retry"
type Span = {
  name: string
  start: number
  dur: number
  depth: number
  status: Status
  meta: string
}

const principles = [
  {
    key: "resilient",
    title: "Resilient",
    icon: ShieldCheck,
    body: "Rate limits, flaky tools and hallucinated JSON are the weather, not the exception. Typed errors, retries with backoff, timeouts and fallbacks are designed in — not bolted on.",
    code: [
      ["callTool", ".pipe("],
      ["  Effect.retry", '(Schedule.exponential("250 millis")),'],
      ["  Effect.timeout", '("8 seconds"),'],
      ["  Effect.orElse", "(() => fallbackProvider)"],
      ["", ")"],
    ],
    spans: [
      {
        name: "agent.run",
        start: 0,
        dur: 100,
        depth: 0,
        status: "ok",
        meta: "trace 7f3a…c21",
      },
      {
        name: "plan · llm",
        start: 2,
        dur: 16,
        depth: 1,
        status: "ok",
        meta: "412 tok",
      },
      {
        name: "tool.search",
        start: 20,
        dur: 13,
        depth: 1,
        status: "error",
        meta: "429 rate limited",
      },
      {
        name: "retry · backoff",
        start: 34,
        dur: 16,
        depth: 1,
        status: "retry",
        meta: "250ms → 500ms",
      },
      {
        name: "tool.search",
        start: 52,
        dur: 13,
        depth: 1,
        status: "ok",
        meta: "fallback provider",
      },
      {
        name: "synthesize · llm",
        start: 67,
        dur: 30,
        depth: 1,
        status: "ok",
        meta: "stream 1.2k tok",
      },
    ],
  },
  {
    key: "observable",
    title: "Observable",
    icon: Activity,
    body: "Every prompt, tool call and token is a span. Latency, cost and eval scores live in the same traces as the rest of the stack — so you debug agents with evidence, not vibes.",
    code: [
      ["generate", ".pipe("],
      ["  Effect.withSpan", '("llm.generate", {'],
      ["    attributes", ": { model, promptVersion }"],
      ["  })", ""],
      ["", ")"],
    ],
    spans: [
      {
        name: "agent.run",
        start: 0,
        dur: 100,
        depth: 0,
        status: "ok",
        meta: "p95 2.1s",
      },
      {
        name: "retrieve.embed",
        start: 3,
        dur: 16,
        depth: 1,
        status: "ok",
        meta: "k=8 · 38ms",
      },
      {
        name: "rerank",
        start: 20,
        dur: 9,
        depth: 2,
        status: "ok",
        meta: "score ≥ 0.72",
      },
      {
        name: "llm.generate",
        start: 31,
        dur: 48,
        depth: 1,
        status: "ok",
        meta: "ttft 180ms · $0.003",
      },
      {
        name: "guardrail.check",
        start: 80,
        dur: 9,
        depth: 1,
        status: "ok",
        meta: "pii: none",
      },
      {
        name: "eval.score",
        start: 90,
        dur: 8,
        depth: 1,
        status: "ok",
        meta: "faithful 0.94",
      },
    ],
  },
  {
    key: "scalable",
    title: "Scalable",
    icon: Network,
    body: "Supervisors, bounded concurrency, queues and back-pressure. Agents fan out across workers and degrade gracefully when traffic doesn't ask for permission.",
    code: [
      ["Effect.forEach", "(tasks, runWorker, {"],
      ["  concurrency", ": 16,"],
      ["  batching", ": true"],
      ["})", ""],
    ],
    spans: [
      {
        name: "supervisor",
        start: 0,
        dur: 100,
        depth: 0,
        status: "ok",
        meta: "16 workers",
      },
      {
        name: "worker[01]",
        start: 5,
        dur: 52,
        depth: 1,
        status: "ok",
        meta: "summarize",
      },
      {
        name: "worker[02]",
        start: 5,
        dur: 40,
        depth: 1,
        status: "ok",
        meta: "classify",
      },
      {
        name: "worker[03]",
        start: 6,
        dur: 64,
        depth: 1,
        status: "retry",
        meta: "restarted",
      },
      {
        name: "worker[04]",
        start: 8,
        dur: 47,
        depth: 1,
        status: "ok",
        meta: "extract",
      },
      {
        name: "merge · reduce",
        start: 74,
        dur: 24,
        depth: 1,
        status: "ok",
        meta: "back-pressure ok",
      },
    ],
  },
] satisfies Array<{
  key: string
  title: string
  icon: typeof Activity
  body: string
  code: string[][]
  spans: Span[]
}>

const statusColor: Record<Status, string> = {
  ok: "bg-glacier/70",
  error: "bg-[#ff5a5a]",
  retry: "bg-ember",
}

function TracePanel({ index }: { index: number }) {
  const p = principles[index]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-bone/10 bg-[#0b0d10]/80 shadow-[0_40px_120px_-40px_rgba(255,154,60,0.25)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-bone/10 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-bone/15" />
          <span className="size-2.5 rounded-full bg-bone/15" />
          <span className="size-2.5 rounded-full bg-bone/15" />
        </div>
        <span className="font-mono text-[10px] tracking-[0.25em] text-bone/40 uppercase">
          trace · {p.key}
        </span>
        <span className="flex items-center gap-2 font-mono text-[10px] text-glacier/80">
          <span className="animate-flicker size-1.5 rounded-full bg-glacier" />{" "}
          live
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={p.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5"
        >
          <div className="mb-3 flex justify-between font-mono text-[9px] text-bone/25">
            {["0ms", "500", "1000", "1500", "2000"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="space-y-2.5">
            {p.spans.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-[8.5rem_1fr] items-center gap-3 sm:grid-cols-[10rem_1fr]"
              >
                <span
                  className="truncate font-mono text-[11px] text-bone/60"
                  style={{ paddingLeft: s.depth * 12 }}
                >
                  {s.depth > 0 && <span className="text-bone/20">└ </span>}
                  {s.name}
                </span>
                <div className="relative h-6 rounded bg-bone/[0.03]">
                  <motion.div
                    className={`absolute inset-y-1 rounded-sm ${statusColor[s.status]} ${s.depth === 0 ? "opacity-30" : ""}`}
                    style={{ left: `${s.start}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.dur}%` }}
                    transition={{
                      duration: 0.7,
                      delay: 0.15 + i * 0.22,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                  <motion.span
                    className="absolute top-1/2 -translate-y-1/2 font-mono text-[9.5px] whitespace-nowrap text-bone/70"
                    style={
                      s.depth === 0
                        ? { right: "1.5%" }
                        : s.start + s.dur > 70
                          ? { right: `${100 - s.start + 1.5}%` }
                          : { left: `${s.start + s.dur + 1.5}%` }
                    }
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.22 }}
                  >
                    {s.meta}
                  </motion.span>
                </div>
              </div>
            ))}
          </div>

          <pre className="mt-6 overflow-x-auto rounded-xl border border-bone/5 bg-black/40 p-4 font-mono text-[12px] leading-6">
            {p.code.map(([fn, rest], i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                <span className="mr-4 inline-block w-3 text-right text-bone/20 select-none">
                  {i + 1}
                </span>
                <span className="text-ember-soft">{fn}</span>
                <span className="text-bone/60">{rest}</span>
              </motion.div>
            ))}
          </pre>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function Principles() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.3 })

  useEffect(() => {
    if (paused || !inView) return
    const id = window.setInterval(
      () => setActive((a) => (a + 1) % principles.length),
      5200
    )
    return () => clearInterval(id)
  }, [paused, inView])

  return (
    <section
      id="principles"
      ref={ref}
      className="relative bg-ink px-6 py-32 md:px-10 md:py-44"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-0 size-[40rem] rounded-full bg-ember/10 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <div className="mb-8 flex items-center gap-4 font-mono text-[11px] tracking-[0.3em] text-bone/40 uppercase">
            <span className="h-px w-10 bg-bone/30" />
            Scene 03 — Principles
          </div>
          <h2 className="font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em] text-bone">
            Agents are distributed systems.
            <span className="block text-bone/35 italic">
              Build them like it.
            </span>
          </h2>

          <div
            className="mt-14 divide-y divide-bone/10 border-y border-bone/10"
            onMouseLeave={() => setPaused(false)}
          >
            {principles.map((p, i) => {
              const Icon = p.icon
              const isActive = i === active
              return (
                <button
                  key={p.key}
                  type="button"
                  onMouseEnter={() => {
                    setActive(i)
                    setPaused(true)
                  }}
                  onClick={() => {
                    setActive(i)
                    setPaused(true)
                  }}
                  className="group relative block w-full py-7 text-left"
                >
                  {isActive && (
                    <motion.span
                      layoutId="principle-bar"
                      className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-ember to-transparent"
                    />
                  )}
                  <div className="flex items-center gap-5">
                    <span className="font-mono text-[11px] text-bone/30">
                      0{i + 1}
                    </span>
                    <Icon
                      className={`size-5 transition-colors ${isActive ? "text-ember" : "text-bone/30"}`}
                    />
                    <span
                      className={`font-display text-3xl transition-colors md:text-4xl ${
                        isActive
                          ? "text-bone"
                          : "text-bone/40 group-hover:text-bone/70"
                      }`}
                    >
                      {p.title}
                    </span>
                  </div>
                  <motion.div
                    initial={false}
                    animate={{
                      height: isActive ? "auto" : 0,
                      opacity: isActive ? 1 : 0,
                    }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="max-w-lg pt-4 pl-[4.6rem] leading-relaxed text-bone/60">
                      {p.body}
                    </p>
                  </motion.div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <TracePanel index={active} />
        </div>
      </div>
    </section>
  )
}
