import { useEffect, useRef, useState } from "react"
import { Play } from "lucide-react"
import { run, supervisor } from "@/lib/supervise/supervisor"
import type { SupervisorEvent } from "@/lib/supervise/supervisor"
import { createWorkers } from "@/lib/supervise/workers"
import { mulberry32 } from "@/lib/traces/sampling"
import { Demo } from "../article"
import { ActionButton, Segmented, Slider } from "../demos/controls"

const DURATION = 8000

type Mark = {
  at: number
  lane: "search" | "tools" | "app"
  kind: "crash" | "gave_up"
}

export function IntensityLab() {
  const [mode, setMode] = useState<"flaky" | "broken">("flaky")
  const [maxRestarts, setMaxRestarts] = useState(3)
  const [withinS, setWithinS] = useState(5)
  const [marks, setMarks] = useState<Array<Mark>>([])
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const stopRef = useRef<() => void>(() => {})

  useEffect(() => () => stopRef.current(), [])

  const start = () => {
    stopRef.current()
    const w = createWorkers()
    const t0 = performance.now()
    const timers: Array<ReturnType<typeof setTimeout>> = []
    let raf = 0
    setMarks([])
    setRunning(true)

    const onEvent = (e: SupervisorEvent) => {
      const at = performance.now() - t0
      if (e.type === "crashed" && e.id === "search")
        setMarks((m) => [...m, { at, lane: "search", kind: "crash" }])
      if (e.type === "gave_up")
        setMarks((m) => [
          ...m,
          { at, lane: e.id === "app" ? "app" : "tools", kind: "gave_up" },
        ])
      if (e.type === "gave_up" && e.id === "app") finish()
    }

    const app = run(
      supervisor({
        id: "app",
        strategy: "one_for_one",
        maxRestarts: 1,
        withinMs: 5000,
        onEvent,
        children: [
          supervisor({
            id: "tools",
            strategy: "one_for_one",
            maxRestarts,
            withinMs: withinS * 1000,
            onEvent,
            children: [
              w.worker("search", {
                bootFailure: () =>
                  mode === "broken" ? "401 invalid API key" : null,
              }),
            ],
          }),
        ],
      })
    )

    if (mode === "flaky") {
      const rand = mulberry32(5)
      let t = 0
      for (;;) {
        t += 600 + rand() * 2600
        if (t > DURATION) break
        timers.push(setTimeout(() => w.crash("search", "429 rate limited"), t))
      }
    }

    const frame = () => {
      const now = performance.now() - t0
      setElapsed(Math.min(now, DURATION))
      if (now < DURATION) raf = requestAnimationFrame(frame)
      else finish()
    }
    raf = requestAnimationFrame(frame)

    function finish() {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      app.stop()
      setRunning(false)
    }
    stopRef.current = finish
  }

  const crashes = marks.filter((m) => m.kind === "crash").length
  const toolsGaveUp = marks.find((m) => m.lane === "tools")
  const appDown = marks.find((m) => m.lane === "app")
  const x = (at: number) => `${(at / DURATION) * 100}%`

  return (
    <Demo
      label="Fig. 02"
      title="When to stop restarting"
      hint="Real supervisor, real time"
    >
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Segmented
          label="Failure"
          value={mode}
          onChange={setMode}
          options={[
            { value: "flaky", label: "Flaky: 429s" },
            { value: "broken", label: "Broken: bad API key" },
          ]}
        />
        <div />
        <Slider
          label="tools max_restarts"
          value={maxRestarts}
          min={1}
          max={10}
          step={1}
          format={String}
          onChange={setMaxRestarts}
        />
        <Slider
          label="within (max_seconds)"
          value={withinS}
          min={1}
          max={10}
          step={1}
          format={(v) => `${v}s`}
          onChange={setWithinS}
        />
      </div>

      <div className="mt-6 space-y-2">
        {(["search", "tools", "app"] as const).map((lane) => (
          <div
            key={lane}
            className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3"
          >
            <span className="font-mono text-[10px] text-bone/45">{lane}</span>
            <div className="relative h-6 rounded bg-bone/[0.04]">
              <div
                className="absolute inset-y-0 left-0 rounded bg-bone/[0.05]"
                style={{ width: x(elapsed) }}
              />
              {marks
                .filter((m) => m.lane === lane)
                .map((m, i) => (
                  <span
                    key={i}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      m.kind === "crash"
                        ? "size-2 bg-[#ff8f84]"
                        : "size-3.5 bg-[#ff5d4d] ring-2 ring-[#ff5d4d]/30"
                    }`}
                    style={{ left: x(m.at) }}
                    title={`${m.kind} at ${(m.at / 1000).toFixed(2)}s`}
                  />
                ))}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 font-mono text-[9px] text-bone/25">
          <span />
          <div className="flex justify-between">
            <span>0s</span>
            <span>8s</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p
          className={`font-mono text-[11px] ${appDown ? "text-[#ff8f84]" : "text-bone/50"}`}
        >
          {marks.length === 0
            ? "Run it to watch the supervisor decide."
            : appDown
              ? `tools gave up at ${(toolsGaveUp!.at / 1000).toFixed(2)}s, app restarted it once, then app gave up at ${(appDown.at / 1000).toFixed(2)}s. Application down, loudly.`
              : toolsGaveUp
                ? `tools gave up at ${(toolsGaveUp.at / 1000).toFixed(2)}s; app restarted the subtree and it recovered.`
                : `${crashes} crashes, ${crashes} restarts, zero downtime.`}
        </p>
        <ActionButton onClick={start} disabled={running}>
          <Play className="size-3.5" /> {running ? "Running…" : "Run 8 seconds"}
        </ActionButton>
      </div>
    </Demo>
  )
}
