import { useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import { Play } from "lucide-react"
import type { Scenario } from "@/lib/traces/pipeline"
import type { WireSpan, WireTrace } from "@/lib/traces/telemetry"
import { Demo } from "../article"
import { ActionButton, Segmented } from "../demos/controls"

const options: ReadonlyArray<{ value: Scenario; label: string }> = [
  { value: "healthy", label: "Healthy" },
  { value: "slow-provider", label: "Slow provider" },
  { value: "tool-error", label: "Tool timeout" },
  { value: "context-bloat", label: "Context bloat" },
  { value: "ungrounded", label: "Hallucination" },
]

type Row = WireSpan & { depth: number }

const flatten = (spans: ReadonlyArray<WireSpan>): Array<Row> => {
  const children = new Map<string | null, Array<WireSpan>>()
  for (const s of spans) {
    const list = children.get(s.parent) ?? []
    list.push(s)
    children.set(s.parent, list)
  }
  const out: Array<Row> = []
  const walk = (parent: string | null, depth: number) => {
    for (const s of (children.get(parent) ?? []).sort((a, b) => a.start - b.start)) {
      out.push({ ...s, depth })
      walk(s.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

const colorOf = (s: WireSpan) => {
  if (s.status.code === 2) return "bg-[#ff5d4d]"
  const op = s.attributes["gen_ai.operation.name"]
  if (op === "chat") return "bg-ember"
  if (op === "execute_tool") return "bg-glacier"
  if (op === "embeddings") return "bg-glacier/50"
  if (op === "evaluate")
    return s.attributes["gen_ai.evaluation.score.label"] === "fail"
      ? "bg-[#ff5d4d]/70"
      : "bg-[#8fd6a0]"
  if (op === "invoke_agent" || op === "agent_step") return "bg-ember/35"
  if (s.attributes["db.system.name"]) return "bg-bone/45"
  return "bg-bone/20"
}

const fmtMs = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`)

const fmtValue = (v: unknown) =>
  Array.isArray(v) ? v.join(", ") : typeof v === "number" ? String(v) : String(v)

export function TraceExplorer() {
  const [scenario, setScenario] = useState<Scenario>("healthy")
  const [trace, setTrace] = useState<WireTrace | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const runs = useRef(0)

  const run = async (next = scenario) => {
    const id = ++runs.current
    setRunning(true)
    try {
      const res = await fetch("/api/trace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario: next }),
      })
      const data = (await res.json()) as WireTrace
      if (runs.current !== id) return
      setTrace(data)
      const flagged =
        data.spans.find((s) => s.status.code === 2) ??
        data.spans.find((s) => s.attributes["gen_ai.evaluation.score.label"] === "fail") ??
        data.spans.find((s) => s.events.some((e) => e.name === "budget.exceeded")) ??
        data.spans.find((s) => s.attributes["gen_ai.operation.name"] === "chat")
      setSelected(flagged?.id ?? null)
    } finally {
      if (runs.current === id) setRunning(false)
    }
  }

  const rows = useMemo(() => (trace ? flatten(trace.spans) : []), [trace])
  const root = rows.at(0)
  const total = root?.duration ?? 1
  const active = rows.find((r) => r.id === selected) ?? root

  const summary = root && [
    ["HTTP", String(root.attributes["http.response.status_code"] ?? "—")],
    ["Duration", fmtMs(root.duration)],
    ["Spans", String(rows.length)],
    [
      "Tokens",
      `${Number(root.attributes["gen_ai.usage.input_tokens"] ?? 0).toLocaleString()} in · ${String(root.attributes["gen_ai.usage.output_tokens"] ?? 0)} out`,
    ],
    ["Cost", `$${Number(root.attributes["app.llm.cost_usd"] ?? 0).toFixed(4)}`],
    ["Groundedness", String(root.attributes["app.eval.groundedness"] ?? "—")],
    ["Failed spans", String(rows.filter((r) => r.status.code === 2).length)],
  ]

  return (
    <Demo label="Fig. 01" title="One request, every span" hint="Real OpenTelemetry spans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Scenario"
          value={scenario}
          options={options}
          onChange={(v) => {
            setScenario(v)
            void run(v)
          }}
        />
        <ActionButton onClick={() => void run()} disabled={running}>
          <Play className="size-3.5" /> {running ? "Tracing…" : trace ? "Run again" : "Run request"}
        </ActionButton>
      </div>

      {summary && (
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-bone/10 bg-bone/10 sm:grid-cols-4 lg:grid-cols-7">
          {summary.map(([k, v]) => (
            <div key={k} className="bg-[#0a0b0d] px-3 py-2">
              <dt className="font-mono text-[9px] tracking-[0.2em] text-bone/35 uppercase">{k}</dt>
              <dd
                className={`mt-0.5 truncate font-mono text-xs tabular-nums ${
                  (k === "Failed spans" && v !== "0") ||
                  (k === "Groundedness" && Number(v) < 0.7)
                    ? "text-[#ff8f84]"
                    : "text-bone/80"
                }`}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div
        className={`mt-4 rounded-lg border border-bone/10 bg-ink/60 transition-opacity ${running ? "opacity-50" : ""}`}
      >
        {rows.length === 0 ? (
          <p className="px-4 py-16 text-center font-mono text-[11px] text-bone/35">
            {running ? "Running the pipeline on the server…" : "Run a request to capture its trace."}
          </p>
        ) : (
          <ul className="py-1.5" role="listbox" aria-label="Spans">
            {rows.map((r, i) => (
              <li key={r.id} role="option" aria-selected={r.id === active?.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.id)}
                  className={`grid w-full grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3.5rem] items-center gap-3 px-3 py-1 text-left sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_4rem] ${
                    r.id === active?.id ? "bg-bone/[0.06]" : "hover:bg-bone/[0.03]"
                  }`}
                >
                  <span
                    className={`truncate font-mono text-[11px] ${r.status.code === 2 ? "text-[#ff8f84]" : "text-bone/65"}`}
                    style={{ paddingLeft: `${r.depth * 10}px` }}
                  >
                    {r.name}
                  </span>
                  <span className="relative h-3.5">
                    <motion.span
                      key={`${trace?.traceId}-${r.id}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.45, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] }}
                      className={`absolute top-0.5 h-2.5 origin-left rounded-sm ${colorOf(r)}`}
                      style={{
                        left: `${(r.start / total) * 100}%`,
                        width: `max(2px, ${(r.duration / total) * 100}%)`,
                      }}
                    />
                    {r.events.map((e) => (
                      <span
                        key={`${e.name}-${e.at}`}
                        title={e.name}
                        className="absolute top-0 h-3.5 w-px bg-bone"
                        style={{ left: `${(e.at / total) * 100}%` }}
                      />
                    ))}
                  </span>
                  <span className="text-right font-mono text-[10px] text-bone/40 tabular-nums">
                    {fmtMs(r.duration)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active && (
        <div className="mt-4 grid gap-4 rounded-lg border border-bone/10 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-bone/35 uppercase">
              Attributes · {active.name}
            </p>
            <dl className="mt-2 space-y-1 font-mono text-[11px]">
              {Object.entries(active.attributes).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3">
                  <dt className={`truncate ${k.startsWith("gen_ai.") ? "text-ember/80" : "text-bone/45"}`}>{k}</dt>
                  <dd className="truncate text-bone/80">{fmtValue(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-bone/35 uppercase">
              Status & events
            </p>
            <p
              className={`mt-2 font-mono text-[11px] ${active.status.code === 2 ? "text-[#ff8f84]" : "text-bone/60"}`}
            >
              {active.status.code === 2 ? `ERROR · ${active.status.message ?? ""}` : "UNSET · ok"}
            </p>
            {active.events.length === 0 ? (
              <p className="mt-2 font-mono text-[11px] text-bone/30">No events</p>
            ) : (
              active.events.map((e) => (
                <div key={`${e.name}-${e.at}`} className="mt-2 rounded-md bg-bone/[0.04] p-2 font-mono text-[11px]">
                  <p className="text-bone/80">
                    {e.name} <span className="text-bone/35">@ {fmtMs(e.at)}</span>
                  </p>
                  {Object.entries(e.attributes).map(([k, v]) => (
                    <p key={k} className="mt-0.5 break-words text-bone/45">
                      {k} = <span className="text-bone/70">{fmtValue(v)}</span>
                    </p>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Demo>
  )
}
