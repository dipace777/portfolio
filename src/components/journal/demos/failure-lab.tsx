import { useEffect, useRef, useState } from "react"
import { Effect, Exit } from "effect"
import type { Fiber } from "effect"
import { Play, RotateCcw } from "lucide-react"
import { highlight } from "sugar-high"
import { fakeProvider, resilient } from "@/lib/durable/llm"
import type { Attempt, Behavior, Outcome, Recorder } from "@/lib/durable/llm"
import { Demo } from "../article"
import { ActionButton, Segmented } from "./controls"

type Scenario = "rate-limit" | "hang" | "outage" | "garbage"
type Mode = "naive" | "effect"
type Result = { ok: boolean; title: string; detail: string }

const scenarios: Record<Scenario, { label: string; script: Array<Behavior> }> =
  {
    "rate-limit": { label: "429 twice", script: ["429", "429", "ok"] },
    hang: { label: "Request hangs", script: ["hang", "ok"] },
    outage: { label: "Provider outage", script: ["down"] },
    garbage: { label: "Garbage JSON", script: ["malformed", "ok"] },
  }

const NAIVE_PATIENCE = 3200
const policy = { timeoutMs: 1200, baseMs: 250, retries: 3, fallback: true }
const lanes = ["anthropic", "openai"] as const

const naiveCode = `const res = await fetch(ANTHROPIC_URL, { method: "POST", body })
const { text } = await res.json()
return text`

const effectCode = `primary(prompt).pipe(
  Effect.timeout("1.2 seconds"),
  Effect.retry({ schedule: retryPolicy, while: isRetryable }),
  Effect.catch(() => fallback(prompt)),
)`

const outcomeStyle: Record<Outcome, { bar: string; label: string }> = {
  ok: { bar: "bg-glacier/80", label: "200 ok" },
  "429": { bar: "bg-ember/80", label: "429" },
  malformed: { bar: "bg-ember/80", label: "bad json" },
  hang: { bar: "bg-[#ff5d4d]/70", label: "hang" },
  timeout: { bar: "bg-[#ff5d4d]/70", label: "timed out" },
  stuck: { bar: "bg-[#ff5d4d]/40", label: "still waiting…" },
  down: { bar: "bg-[#ff5d4d]/80", label: "503" },
}

const naiveFailure: Record<Exclude<Behavior, "ok" | "hang">, string> = {
  "429": "RateLimited escapes as an exception. The run dies at step one.",
  down: "ProviderDown bubbles up. Nothing tried the other provider.",
  malformed: "JSON.parse throws halfway through a run you already paid for.",
}

export function FailureLab() {
  const [scenario, setScenario] = useState<Scenario>("rate-limit")
  const [mode, setMode] = useState<Mode>("effect")
  const [attempts, setAttempts] = useState<Array<Attempt>>([])
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [now, setNow] = useState(0)
  const fiber = useRef<Fiber.Fiber<string, unknown> | null>(null)
  const t0 = useRef(0)
  const runs = useRef(0)

  useEffect(() => {
    if (!running) return
    let raf = 0
    const tick = () => {
      setNow(performance.now() - t0.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  useEffect(
    () => () => {
      if (fiber.current) fiber.current.interruptUnsafe()
    },
    []
  )

  const reset = () => {
    runs.current++
    if (fiber.current) fiber.current.interruptUnsafe()
    fiber.current = null
    setAttempts([])
    setResult(null)
    setRunning(false)
    setNow(0)
  }

  const run = () => {
    reset()
    const runId = ++runs.current
    const log: Array<Attempt> = []
    const record: Recorder = {
      start: (provider, attempt) => {
        const id = log.length
        log.push({
          id,
          provider,
          attempt,
          start: performance.now() - t0.current,
        })
        if (runs.current === runId) setAttempts([...log])
        return id
      },
      end: (id, outcome) => {
        if (runs.current !== runId) return
        log[id] = {
          ...log[id],
          end: performance.now() - t0.current,
          outcome:
            mode === "naive" && outcome === "timeout" ? "stuck" : outcome,
        }
        setAttempts([...log])
      },
    }
    const script = scenarios[scenario].script
    const primary = fakeProvider("anthropic", script, record)
    const fallback = fakeProvider("openai", ["ok"], record)
    const program =
      mode === "effect"
        ? resilient(primary, fallback, policy)("summarize the incident")
        : primary("summarize the incident").pipe(Effect.timeout(NAIVE_PATIENCE))

    t0.current = performance.now()
    setRunning(true)
    const f = Effect.runFork(program)
    fiber.current = f
    f.addObserver((exit) => {
      if (fiber.current !== f) return
      const ms = Math.round(performance.now() - t0.current)
      setRunning(false)
      setNow(ms)
      if (Exit.isSuccess(exit)) {
        const provider = exit.value.split(":")[0]
        setResult({
          ok: true,
          title: `Answered by ${provider} in ${ms}ms`,
          detail:
            log.length > 1
              ? `${log.length - 1} failure${log.length > 2 ? "s" : ""} absorbed. The caller never knew.`
              : "Clean run.",
        })
        return
      }
      const last = script[Math.min(log.length - 1, script.length - 1)]
      setResult(
        last === "hang"
          ? {
              ok: false,
              title: "No answer. No error. No log.",
              detail:
                "The promise is still pending. Your agent is a zombie holding a connection open.",
            }
          : {
              ok: false,
              title: "Run crashed",
              detail:
                last === "ok" ? "Every provider failed." : naiveFailure[last],
            }
      )
    })
  }

  const horizon = Math.max(
    3600,
    now * 1.08,
    ...attempts.map((a) => (a.end ?? now) * 1.08)
  )
  const pct = (ms: number) => `${(ms / horizon) * 100}%`

  return (
    <Demo
      label="Fig. 03"
      title="Failure lab"
      hint="Real Effect v4, running in your browser"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented
          label="Failure to inject"
          value={scenario}
          onChange={(v) => {
            setScenario(v)
            reset()
          }}
          options={(Object.keys(scenarios) as Array<Scenario>).map((k) => ({
            value: k,
            label: scenarios[k].label,
          }))}
        />
        <Segmented
          label="Implementation"
          value={mode}
          onChange={(v) => {
            setMode(v)
            reset()
          }}
          options={[
            { value: "naive", label: "await fetch" },
            { value: "effect", label: "Effect pipeline" },
          ]}
        />
      </div>

      <pre className="code-block mt-5 overflow-x-auto rounded-lg border border-bone/10 bg-ink/60 px-4 py-3 font-mono text-[12px] leading-[1.7]">
        <code
          dangerouslySetInnerHTML={{
            __html: highlight(mode === "naive" ? naiveCode : effectCode),
          }}
        />
      </pre>

      <div className="mt-6 grid gap-3" aria-live="polite">
        {lanes.map((lane) => (
          <div key={lane} className="flex items-center gap-3">
            <span className="w-20 shrink-0 font-mono text-[10px] tracking-wider text-bone/40">
              {lane}
            </span>
            <div className="relative h-12 flex-1 rounded-md border border-bone/5 bg-bone/[0.02]">
              {attempts
                .filter((a) => a.provider === lane)
                .map((a, i, own) => {
                  const end = a.end ?? now
                  const prev = own[i - 1] as Attempt | undefined
                  const style = a.outcome ? outcomeStyle[a.outcome] : null
                  return (
                    <div key={a.id}>
                      {prev?.end !== undefined && a.start - prev.end > 40 && (
                        <div
                          className="absolute bottom-[0.8rem] border-t border-dashed border-bone/25"
                          style={{
                            left: pct(prev.end),
                            width: pct(a.start - prev.end),
                          }}
                        >
                          <span className="absolute -top-[1.35rem] left-1/2 -translate-x-1/2 font-mono text-[9px] whitespace-nowrap text-bone/40">
                            {Math.round(a.start - prev.end)}ms
                          </span>
                        </div>
                      )}
                      <div
                        className={`absolute top-5 bottom-1.5 flex items-center overflow-hidden rounded-[4px] px-1.5 ${
                          style ? style.bar : "animate-pulse bg-bone/30"
                        }`}
                        style={{
                          left: pct(a.start),
                          width: `max(4px, ${pct(end - a.start)})`,
                        }}
                      >
                        <span className="font-mono text-[9px] whitespace-nowrap text-ink">
                          {style ? style.label : "…"}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
        <div className="flex justify-between pl-[5.75rem] font-mono text-[10px] text-bone/30">
          <span>0ms</span>
          <span className="text-bone/50 tabular-nums">
            t = {Math.round(now)}ms
          </span>
          <span className="tabular-nums">{Math.round(horizon)}ms</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-bone/10 pt-5">
        <div className="min-h-12" aria-live="polite">
          {result ? (
            <>
              <p
                className={`font-medium ${result.ok ? "text-glacier" : "text-[#ff8f84]"}`}
              >
                {result.title}
              </p>
              <p className="mt-1 text-sm text-bone/50">{result.detail}</p>
            </>
          ) : (
            <p className="text-sm text-bone/40">
              {running
                ? "Running…"
                : "Pick a failure, pick an implementation, press run."}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <ActionButton
            tone="ghost"
            onClick={reset}
            disabled={!attempts.length}
          >
            <RotateCcw className="size-3.5" /> Reset
          </ActionButton>
          <ActionButton onClick={run} disabled={running}>
            <Play className="size-3.5" /> Run
          </ActionButton>
        </div>
      </div>
    </Demo>
  )
}
