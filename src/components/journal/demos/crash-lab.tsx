import { useEffect, useRef, useState } from "react"
import { Effect, Exit } from "effect"
import type { Fiber } from "effect"
import { Play, RotateCcw, Skull, StepForward } from "lucide-react"
import {
  Journal,
  amnesiacJournal,
  memoryJournal,
  step,
} from "@/lib/durable/workflow"
import { Demo } from "../article"
import { ActionButton, Toggle } from "./controls"

type StepName = "plan" | "search" | "draft" | "publish"
type Status = "idle" | "running" | "done" | "replayed" | "crashed"
type Phase = "idle" | "running" | "crashed" | "finished"

const steps: ReadonlyArray<{
  name: StepName
  kind: string
  ms: number
  tokens?: number
}> = [
  { name: "plan", kind: "llm", ms: 1100, tokens: 412 },
  { name: "search", kind: "tool", ms: 800 },
  { name: "draft", kind: "llm", ms: 1600, tokens: 1180 },
  { name: "publish", kind: "side effect", ms: 1000 },
]

const RUN_ID = "run_7f3a"
const idle = () =>
  Object.fromEntries(steps.map((s) => [s.name, "idle"])) as Record<
    StepName,
    Status
  >

const statusStyle: Record<Status, string> = {
  idle: "border-bone/10 text-bone/35",
  running: "border-ember/60 bg-ember/10 text-bone",
  done: "border-glacier/40 bg-glacier/10 text-bone",
  replayed: "border-glacier/25 bg-glacier/[0.04] text-bone/70",
  crashed: "border-[#ff5d4d]/60 bg-[#ff5d4d]/10 text-[#ff8f84]",
}

const statusLabel: Record<Status, string> = {
  idle: "pending",
  running: "running",
  done: "done",
  replayed: "replayed",
  crashed: "killed",
}

export function CrashLab() {
  const [durable, setDurable] = useState(true)
  const [idempotent, setIdempotent] = useState(true)
  const [status, setStatus] = useState(idle)
  const [phase, setPhase] = useState<Phase>("idle")
  const [tokens, setTokens] = useState(0)
  const [posts, setPosts] = useState(0)
  const [dropped, setDropped] = useState(0)
  const [log, setLog] = useState<Array<string>>([])

  const store = useRef(new Map<string, unknown>())
  const seenKeys = useRef(new Set<string>())
  const fiber = useRef<Fiber.Fiber<void> | null>(null)
  const current = useRef<StepName | null>(null)

  useEffect(() => () => fiber.current?.interruptUnsafe(), [])

  const say = (line: string) => setLog((l) => [...l.slice(-6), line])
  const mark = (name: StepName, s: Status) =>
    setStatus((prev) => ({ ...prev, [name]: s }))

  const body = (s: (typeof steps)[number]) =>
    Effect.gen(function* () {
      yield* Effect.sync(() => {
        current.current = s.name
        mark(s.name, "running")
        say(`▸ ${s.name.padEnd(8)} running`)
        if (s.name === "publish") {
          const key = `${RUN_ID}:publish`
          if (idempotent && seenKeys.current.has(key)) {
            setDropped((d) => d + 1)
            say(`  slack    duplicate dropped (idempotency key)`)
          } else {
            seenKeys.current.add(key)
            setPosts((p) => p + 1)
            say(`  slack    message posted to #research`)
          }
        }
      })
      yield* Effect.sleep(s.ms)
      yield* Effect.sync(() => {
        if (s.tokens) setTokens((t) => t + (s.tokens ?? 0))
        mark(s.name, "done")
        say(
          `✓ ${s.name.padEnd(8)} ${durable ? "saved to journal" : "done (not saved)"}`
        )
      })
      return s.name
    })

  const start = () => {
    setStatus(idle())
    setPhase("running")
    const journal = durable
      ? memoryJournal(store.current, {
          onReplay: (key) => {
            mark(key as StepName, "replayed")
            say(`↺ ${key.padEnd(8)} replayed from journal · 0 tokens`)
          },
        })
      : amnesiacJournal
    const program = Effect.gen(function* () {
      for (const s of steps) yield* step(s.name, body(s))
    }).pipe(Effect.provideService(Journal, journal))

    const f = Effect.runFork(program)
    fiber.current = f
    f.addObserver((exit) => {
      if (fiber.current !== f || !Exit.isSuccess(exit)) return
      current.current = null
      setPhase("finished")
      say(`■ ${RUN_ID} complete`)
    })
  }

  const fresh = () => {
    fiber.current?.interruptUnsafe()
    store.current.clear()
    seenKeys.current.clear()
    setTokens(0)
    setPosts(0)
    setDropped(0)
    setLog([`● ${RUN_ID} started`])
    start()
  }

  const crash = () => {
    const f = fiber.current
    fiber.current = null
    f?.interruptUnsafe()
    if (current.current) mark(current.current, "crashed")
    setPhase("crashed")
    say(`✗ SIGKILL  pod evicted mid-${current.current ?? "run"}`)
  }

  const resume = () => {
    say(`● ${RUN_ID} resuming on a new pod`)
    start()
  }

  const reset = () => {
    fiber.current?.interruptUnsafe()
    fiber.current = null
    store.current.clear()
    seenKeys.current.clear()
    setStatus(idle())
    setPhase("idle")
    setTokens(0)
    setPosts(0)
    setDropped(0)
    setLog([])
  }

  const locked = phase === "running" || phase === "crashed"

  return (
    <Demo
      label="Fig. 04"
      title="Kill the pod"
      hint="Crash it mid-run, then resume"
    >
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div className={locked ? "pointer-events-none opacity-40" : ""}>
          <Toggle
            label="Step journal"
            checked={durable}
            onChange={setDurable}
          />
        </div>
        <div className={locked ? "pointer-events-none opacity-40" : ""}>
          <Toggle
            label="Idempotency key"
            checked={idempotent}
            onChange={setIdempotent}
          />
        </div>
      </div>

      <ol className="mt-6 grid gap-2 sm:grid-cols-4">
        {steps.map((s, i) => (
          <li
            key={s.name}
            className={`relative rounded-lg border px-3 py-3 transition-colors duration-300 ${statusStyle[status[s.name]]}`}
          >
            <p className="font-mono text-[10px] tracking-wider opacity-60">
              0{i + 1} · {s.kind}
            </p>
            <p className="mt-1 font-mono text-sm">step(&quot;{s.name}&quot;)</p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase">
              {statusLabel[status[s.name]]}
            </p>
            {status[s.name] === "running" && (
              <span
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ember"
                style={{ animation: `grow ${s.ms}ms linear forwards` }}
              />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <pre
          aria-live="polite"
          className="min-h-44 overflow-x-auto rounded-lg border border-bone/10 bg-ink/60 px-4 py-3 font-mono text-[11.5px] leading-[1.8] text-bone/60"
        >
          {log.length ? log.join("\n") : "$ waiting for a run…"}
        </pre>
        <dl className="grid grid-cols-3 gap-3 md:grid-cols-1">
          <Counter label="Tokens billed" value={tokens.toLocaleString()} />
          <Counter
            label="Slack posts"
            value={String(posts)}
            alarm={posts > 1}
          />
          <Counter label="Dupes dropped" value={String(dropped)} />
        </dl>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-bone/10 pt-5">
        <p className="max-w-sm text-sm text-bone/45">
          {phase === "finished" && posts > 1
            ? "Your team just got the same report twice."
            : phase === "finished" && durable
              ? "Resumed runs skip finished steps: no tokens re-billed."
              : "Tip: crash during “publish” to find the nastiest bug."}
        </p>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            tone="ghost"
            onClick={reset}
            disabled={phase === "idle"}
          >
            <RotateCcw className="size-3.5" /> Reset
          </ActionButton>
          {phase === "crashed" ? (
            <ActionButton onClick={resume}>
              <StepForward className="size-3.5" /> Resume
            </ActionButton>
          ) : phase === "running" ? (
            <ActionButton tone="danger" onClick={crash}>
              <Skull className="size-3.5" /> Crash
            </ActionButton>
          ) : (
            <ActionButton onClick={fresh}>
              <Play className="size-3.5" /> Run agent
            </ActionButton>
          )}
        </div>
      </div>
    </Demo>
  )
}

function Counter({
  label,
  value,
  alarm,
}: {
  label: string
  value: string
  alarm?: boolean
}) {
  return (
    <div className="rounded-lg border border-bone/10 px-3 py-2">
      <dt className="font-mono text-[9px] tracking-[0.25em] text-bone/40 uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1 font-display text-3xl leading-none tabular-nums ${
          alarm ? "text-[#ff8f84]" : "text-bone"
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
