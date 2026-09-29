import { useEffect, useRef, useState } from "react"
import { Play } from "lucide-react"
import { travelAgent } from "@/lib/supervise/agent"
import type { AgentState, AgentStep } from "@/lib/supervise/agent"
import { run, supervisor } from "@/lib/supervise/supervisor"
import { Demo } from "../article"
import { ActionButton, Toggle } from "../demos/controls"

const plan = [
  "search flights",
  "search hotels",
  "compare prices",
  "check visa",
  "draft itinerary",
  "book",
]
const MAX_STEPS = 20

type Outcome = { kind: "done" | "capped"; tokens: number; steps: number } | null

export function TripwireLab() {
  const [tripwires, setTripwires] = useState(true)
  const [checkpoints, setCheckpoints] = useState(true)
  const [steps, setSteps] = useState<Array<AgentStep>>([])
  const [crash, setCrash] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [running, setRunning] = useState(false)
  const stopRef = useRef<() => void>(() => {})

  useEffect(() => () => stopRef.current(), [])

  const start = () => {
    stopRef.current()
    const log: Array<AgentStep> = []
    setSteps([])
    setCrash(null)
    setOutcome(null)
    setRunning(true)

    const finish = (kind: "done" | "capped") => {
      app.stop()
      setRunning(false)
      setOutcome({
        kind,
        tokens: log.reduce((n, s) => n + s.tokens, 0),
        steps: log.length,
      })
    }

    const app = run(
      supervisor({
        id: "agents",
        strategy: "one_for_one",
        onEvent: (e) => {
          if (e.type !== "crashed") return
          if (e.reason.startsWith("step budget")) finish("capped")
          else setCrash(e.reason)
        },
        children: [
          {
            id: "travel",
            restart: "transient",
            start: travelAgent({
              plan,
              checkpoints: checkpoints ? new Map<string, AgentState>() : null,
              tripwires,
              environment: { poisonAt: 2, poisoned: false },
              maxSteps: MAX_STEPS,
              delayMs: 280,
              onStep: (s) => {
                log.push(s)
                setSteps([...log])
              },
              onDone: () => setTimeout(() => finish("done"), 0),
            }),
          },
        ],
      })
    )
    stopRef.current = () => app.stop()
  }

  const incarnations = [...new Set(steps.map((s) => s.incarnation))]
  const tokens = steps.reduce((n, s) => n + s.tokens, 0)

  return (
    <Demo
      label="Fig. 03"
      title="Crash on purpose"
      hint="An agent with a poisoned context"
    >
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Toggle
          label="Loop tripwire (same call ×3 → crash)"
          checked={tripwires}
          onChange={setTripwires}
        />
        <Toggle
          label="Checkpoint after every step"
          checked={checkpoints}
          onChange={setCheckpoints}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {incarnations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-bone/10 px-4 py-10 text-center font-mono text-[11px] text-bone/35 sm:col-span-2">
            The pricing tool will return an HTML error page once, at step 3.
          </p>
        ) : (
          incarnations.map((inc, i) => (
            <div key={inc} className="rounded-lg border border-bone/10 p-3">
              <p className="font-mono text-[10px] tracking-[0.2em] text-bone/35 uppercase">
                {i === 0 ? "First run" : "After restart"} · &lt;0.{inc + 300}
                .0&gt;
              </p>
              <ol className="mt-2 space-y-1 font-mono text-[11px]">
                {steps
                  .filter((s) => s.incarnation === inc)
                  .map((s, j) => (
                    <li
                      key={j}
                      className={`flex justify-between gap-3 ${s.poisoned ? "text-[#ff8f84]" : "text-bone/70"}`}
                    >
                      <span className="truncate">
                        <span className="text-bone/25">
                          {String(j + 1).padStart(2, "0")}{" "}
                        </span>
                        {s.call}
                        {s.poisoned ? " ↺" : ""}
                      </span>
                      <span className="text-bone/30 tabular-nums">
                        {s.tokens.toLocaleString()} tok
                      </span>
                    </li>
                  ))}
              </ol>
              {i === 0 && crash && (
                <p className="mt-2 font-mono text-[11px] text-[#ff5d4d]">
                  ** (Tripwire) {crash}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p
          className={`font-mono text-[11px] ${outcome?.kind === "capped" ? "text-[#ff8f84]" : "text-bone/55"}`}
        >
          {outcome?.kind === "done"
            ? `Itinerary booked. ${outcome.steps} steps, ${outcome.tokens.toLocaleString()} tokens${crash ? ", one crash nobody noticed" : ""}.`
            : outcome?.kind === "capped"
              ? `Stopped at the ${MAX_STEPS}-step cap. ${outcome.tokens.toLocaleString()} tokens, no itinerary, and nothing ever errored.`
              : running
                ? `${steps.length} steps · ${tokens.toLocaleString()} tokens`
                : "Run the agent."}
        </p>
        <ActionButton onClick={start} disabled={running}>
          <Play className="size-3.5" /> {running ? "Running…" : "Run agent"}
        </ActionButton>
      </div>
    </Demo>
  )
}
