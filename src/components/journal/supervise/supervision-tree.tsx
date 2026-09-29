import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { RotateCcw, Zap } from "lucide-react"
import { run, supervisor } from "@/lib/supervise/supervisor"
import type { Strategy, SupervisorEvent } from "@/lib/supervise/supervisor"
import { createWorkers } from "@/lib/supervise/workers"
import { Demo } from "../article"
import { ActionButton } from "../demos/controls"

type Node = {
  status: "up" | "down"
  pid: number
  restarts: number
  cause: "crash" | "sibling" | null
}
type LogLine = {
  at: number
  text: string
  tone: "crash" | "stop" | "start" | "fatal"
}

const strategies: ReadonlyArray<Strategy> = [
  "one_for_one",
  "one_for_all",
  "rest_for_one",
]

const layout = [
  { id: "session", label: "session store", note: "conversation memory" },
  {
    id: "research",
    label: "research",
    note: "share one plan",
    children: [
      { id: "planner", label: "planner" },
      { id: "researcher", label: "researcher" },
      { id: "writer", label: "writer" },
    ],
  },
  {
    id: "tools",
    label: "tools",
    note: "independent",
    children: [
      { id: "search", label: "search" },
      { id: "browser", label: "browser" },
      { id: "sandbox", label: "code sandbox" },
    ],
  },
] as const

const supervisors = ["app", "research", "tools"] as const
type SupId = (typeof supervisors)[number]

function Card({
  id,
  label,
  note,
  sup,
  node: n,
  down,
  strategy,
  onCrash,
  onCycle,
}: {
  id: string
  label: string
  note?: string
  sup?: SupId
  node: Node | undefined
  down: boolean
  strategy?: Strategy
  onCrash: (id: string) => void
  onCycle: (id: SupId) => void
}) {
  const up = n?.status === "up" && !down
  return (
    <div className="relative">
      {n?.pid ? (
        <motion.span
          key={n.pid}
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 1.12 }}
          transition={{ duration: 0.9 }}
          className={`pointer-events-none absolute inset-0 rounded-lg border-2 ${
            n.cause === "crash"
              ? "border-[#ff5d4d]"
              : n.cause === "sibling"
                ? "border-glacier"
                : "border-transparent"
          }`}
        />
      ) : null}
      <div
        className={`rounded-lg border px-3 py-2 transition-colors ${
          up
            ? sup
              ? "border-ember/40 bg-ember/[0.05]"
              : "border-bone/15 bg-bone/[0.03]"
            : "border-[#ff5d4d]/40 bg-[#ff5d4d]/[0.05]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-mono text-[11px] ${sup ? "text-ember" : "text-bone/80"}`}
          >
            {label}
          </span>
          <span className="font-mono text-[9px] text-bone/35 tabular-nums">
            {up && n.pid ? `<0.${n.pid}.0>` : "down"}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          {sup ? (
            <button
              type="button"
              onClick={() => onCycle(sup)}
              className="rounded-full border border-ember/30 px-2 py-0.5 font-mono text-[9px] text-ember-soft hover:bg-ember/10"
              aria-label={`Strategy for ${label}: ${strategy}. Click to change.`}
            >
              :{strategy}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCrash(id)}
              disabled={!up}
              className="inline-flex items-center gap-1 rounded-full border border-[#ff5d4d]/30 px-2 py-0.5 font-mono text-[9px] text-[#ff8f84] hover:bg-[#ff5d4d]/10 disabled:opacity-30"
              aria-label={`Crash ${label}`}
            >
              <Zap className="size-2.5" /> crash
            </button>
          )}
          <span className="font-mono text-[9px] text-bone/35">
            {note ?? `restarts ${n?.restarts ?? 0}`}
          </span>
        </div>
      </div>
    </div>
  )
}

export function SupervisionTree() {
  const [strategy, setStrategy] = useState<Record<SupId, Strategy>>({
    app: "one_for_one",
    research: "one_for_all",
    tools: "one_for_one",
  })
  const [nodes, setNodes] = useState<Record<string, Node>>({})
  const [log, setLog] = useState<Array<LogLine>>([])
  const [down, setDown] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const workers = useRef(createWorkers())
  const t0 = useRef(0)

  const onEvent = useCallback((e: SupervisorEvent) => {
    const at = performance.now() - t0.current
    if (e.type === "gave_up") {
      setLog((l) => [
        ...l.slice(-7),
        {
          at,
          tone: "fatal",
          text: `${e.id} gave up after ${e.restarts} restarts, escalating`,
        },
      ])
      if (e.id === "app") setDown(true)
      return
    }
    setNodes((n) => {
      const prev = n[e.id] as Node | undefined
      const base: Node = prev ?? {
        status: "down",
        pid: 0,
        restarts: 0,
        cause: null,
      }
      if (e.type === "started")
        return {
          ...n,
          [e.id]: {
            ...base,
            status: "up",
            pid: e.pid,
            restarts: prev?.pid ? base.restarts + 1 : 0,
          },
        }
      return {
        ...n,
        [e.id]: {
          ...base,
          status: "down",
          cause:
            e.type === "crashed"
              ? "crash"
              : e.type === "terminated"
                ? "sibling"
                : null,
        },
      }
    })
    const line: LogLine | null =
      e.type === "crashed"
        ? {
            at,
            tone: "crash",
            text: `${e.id} <0.${e.pid}.0> crashed: ${e.reason}`,
          }
        : e.type === "terminated"
          ? {
              at,
              tone: "stop",
              text: `${e.id} <0.${e.pid}.0> terminated by supervisor`,
            }
          : e.type === "started"
            ? { at, tone: "start", text: `${e.id} started as <0.${e.pid}.0>` }
            : null
    if (line) setLog((l) => [...l.slice(-7), line])
  }, [])

  useEffect(() => {
    const w = createWorkers()
    workers.current = w
    t0.current = performance.now()
    setNodes({})
    setLog([])
    setDown(false)
    const opts = { maxRestarts: 3, withinMs: 5000, onEvent }
    onEvent({ type: "started", id: "app", pid: 99 })
    const app = run(
      supervisor({
        id: "app",
        strategy: strategy.app,
        ...opts,
        children: [
          w.worker("session"),
          supervisor({
            id: "research",
            strategy: strategy.research,
            ...opts,
            children: [
              w.worker("planner"),
              w.worker("researcher"),
              w.worker("writer"),
            ],
          }),
          supervisor({
            id: "tools",
            strategy: strategy.tools,
            ...opts,
            children: [
              w.worker("search"),
              w.worker("browser"),
              w.worker("sandbox", { restart: "transient" }),
            ],
          }),
        ],
      })
    )
    return () => app.stop()
  }, [strategy, epoch, onEvent])

  const cycle = (id: SupId) =>
    setStrategy((s) => ({
      ...s,
      [id]: strategies[(strategies.indexOf(s[id]) + 1) % strategies.length],
    }))

  const crash = (id: string) =>
    workers.current.crash(
      id,
      id === "search" ? "rate limited" : "bad model output"
    )

  const hammer = async () => {
    for (let i = 0; i < 4; i++) {
      crash("search")
      await new Promise((r) => setTimeout(r, 140))
    }
  }

  const cardProps = (id: string) => ({
    node: nodes[id] as Node | undefined,
    down,
    strategy: (supervisors as ReadonlyArray<string>).includes(id)
      ? strategy[id as SupId]
      : undefined,
    onCrash: crash,
    onCycle: cycle,
  })

  return (
    <Demo
      label="Fig. 01"
      title="A supervision tree for agents"
      hint="Click crash. Click a strategy."
    >
      <Card
        id="app"
        label="app"
        sup="app"
        note="max 3 in 5s"
        {...cardProps("app")}
      />
      <div className="mt-3 grid gap-3 border-l border-bone/10 pl-3 sm:pl-5">
        {layout.map((node) =>
          "children" in node ? (
            <div key={node.id}>
              <Card
                id={node.id}
                label={node.label}
                note={node.note}
                sup={node.id}
                {...cardProps(node.id)}
              />
              <div className="mt-2 grid gap-2 border-l border-bone/10 pl-3 sm:grid-cols-3 sm:pl-5">
                {node.children.map((c) => (
                  <Card
                    key={c.id}
                    id={c.id}
                    label={c.label}
                    {...cardProps(c.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card
              key={node.id}
              id={node.id}
              label={node.label}
              note={node.note}
              {...cardProps(node.id)}
            />
          )
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ActionButton
          tone="danger"
          onClick={() => void hammer()}
          disabled={down}
        >
          <Zap className="size-3.5" /> Crash-loop search
        </ActionButton>
        <ActionButton tone="ghost" onClick={() => setEpoch((e) => e + 1)}>
          <RotateCcw className="size-3.5" /> Reset tree
        </ActionButton>
        {down && (
          <span className="font-mono text-[11px] text-[#ff8f84]">
            Application stopped. In production, this is where your pager goes
            off.
          </span>
        )}
      </div>

      <div
        className="mt-4 rounded-lg border border-bone/10 bg-ink/60 px-3 py-2 font-mono text-[11px] leading-[1.8]"
        aria-live="polite"
      >
        {log.length === 0 ? (
          <p className="text-bone/35">
            iex&gt; Supervisor.which_children(App.Supervisor)
          </p>
        ) : (
          log.map((l, i) => (
            <p
              key={`${l.at}-${i}`}
              className={`truncate ${
                l.tone === "crash"
                  ? "text-[#ff8f84]"
                  : l.tone === "fatal"
                    ? "text-[#ff5d4d]"
                    : l.tone === "stop"
                      ? "text-glacier"
                      : "text-bone/45"
              }`}
            >
              <span className="text-bone/25 tabular-nums">
                {(l.at / 1000).toFixed(3)}s{" "}
              </span>
              {l.text}
            </p>
          ))
        )}
      </div>
    </Demo>
  )
}
