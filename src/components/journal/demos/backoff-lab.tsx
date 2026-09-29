import { useMemo, useState } from "react"
import { Shuffle } from "lucide-react"
import { highlight } from "sugar-high"
import { Demo } from "../article"
import { ActionButton, Slider, Toggle } from "./controls"

const CLIENTS = 8
const BUCKETS = 48

const mulberry32 = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const fmt = (ms: number) =>
  ms >= 1000
    ? `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s`
    : `${Math.round(ms)}ms`

export function BackoffLab() {
  const [base, setBase] = useState(250)
  const [retries, setRetries] = useState(5)
  const [cap, setCap] = useState(8)
  const [jitter, setJitter] = useState(true)
  const [seed, setSeed] = useState(7)

  const { clients, horizon, load, peak } = useMemo(() => {
    const rand = mulberry32(seed)
    const rows = Array.from({ length: CLIENTS }, () => {
      let t = 0
      return Array.from({ length: retries }, (_, n) => {
        const raw = Math.min(base * 2 ** n, cap * 1000)
        const delay = jitter ? raw * (0.8 + 0.4 * rand()) : raw
        t += delay
        return { at: t, delay }
      })
    })
    const end = Math.max(...rows.flat().map((r) => r.at)) * 1.04
    const buckets = Array.from({ length: BUCKETS }, () => 0)
    for (const r of rows.flat()) {
      buckets[Math.min(BUCKETS - 1, Math.floor((r.at / end) * BUCKETS))]++
    }
    return {
      clients: rows,
      horizon: end,
      load: buckets,
      peak: Math.max(...buckets),
    }
  }, [base, retries, cap, jitter, seed])

  const code = [
    `Schedule.exponential("${base} millis").pipe(`,
    jitter
      ? `  Schedule.jittered,`
      : `  // no jitter: every client retries in lockstep`,
    `  Schedule.modifyDelay(({ duration }) =>`,
    `    Effect.succeed(Duration.min(duration, Duration.seconds(${cap})))),`,
    `  (backoff) => Schedule.max([backoff, Schedule.recurs(${retries})]),`,
    `)`,
  ].join("\n")

  return (
    <Demo
      label="Fig. 02"
      title="Eight clients, one bad second"
      hint="Toggle jitter"
    >
      <div className="grid gap-6 md:grid-cols-4">
        <Slider
          label="Base delay"
          value={base}
          min={50}
          max={1000}
          step={50}
          format={(v) => `${v}ms`}
          onChange={setBase}
        />
        <Slider
          label="Retries"
          value={retries}
          min={1}
          max={8}
          step={1}
          format={(v) => `${v}×`}
          onChange={setRetries}
        />
        <Slider
          label="Delay cap"
          value={cap}
          min={1}
          max={30}
          step={1}
          format={(v) => `${v}s`}
          onChange={setCap}
        />
        <div className="flex items-end justify-between gap-3 md:flex-col md:items-start">
          <Toggle label="Jitter" checked={jitter} onChange={setJitter} />
          <ActionButton tone="ghost" onClick={() => setSeed((s) => s + 1)}>
            <Shuffle className="size-3.5" /> Reroll
          </ActionButton>
        </div>
      </div>

      <div className="mt-8 grid gap-2">
        {clients.map((retriesOf, c) => (
          <div key={c} className="relative flex h-5 items-center">
            <span className="w-16 shrink-0 font-mono text-[10px] text-bone/35">
              client {c + 1}
            </span>
            <div className="relative h-px flex-1 bg-bone/10">
              <span className="absolute top-1/2 left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff5d4d]" />
              {retriesOf.map((r, n) => (
                <span
                  key={n}
                  title={`retry ${n + 1} after ${fmt(r.delay)}`}
                  className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember shadow-[0_0_8px_var(--color-ember)] transition-[left] duration-500 ease-out"
                  style={{ left: `${(r.at / horizon) * 100}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2 pl-16">
        <div className="flex h-16 flex-1 items-end gap-px">
          {load.map((v, i) => (
            <span
              key={i}
              className={`flex-1 rounded-t-[2px] transition-all duration-500 ${
                v === peak && v > 1 ? "bg-[#ff5d4d]/80" : "bg-bone/20"
              }`}
              style={{ height: `${(v / CLIENTS) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-16 font-mono text-[10px] text-bone/35">
        <span>0</span>
        <span>requests hitting the provider · peak {peak} at once</span>
        <span>{fmt(horizon)}</span>
      </div>

      <pre className="code-block mt-6 overflow-x-auto rounded-lg border border-bone/10 bg-ink/60 px-4 py-3 font-mono text-[12px] leading-[1.7]">
        <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
      </pre>
    </Demo>
  )
}
