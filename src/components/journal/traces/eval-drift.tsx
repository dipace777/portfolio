import { useMemo, useState } from "react"
import { mulberry32 } from "@/lib/traces/sampling"
import { Demo } from "../article"
import { Slider, Toggle } from "../demos/controls"

const BUCKET_MIN = 15
const BUCKETS = (24 * 60) / BUCKET_MIN
const PER_BUCKET = 60
const DEPLOY = (14 * 60) / BUCKET_MIN
const THRESHOLD = 0.8
const W = 480
const H = 160

type Point = { bucket: number; version: "v7" | "v8"; score: number }

const simulate = (canary: number) => {
  const rand = mulberry32(23)
  const points: Array<Point> = []
  for (let b = 0; b < BUCKETS; b++) {
    for (let i = 0; i < PER_BUCKET; i++) {
      const v8 = b >= DEPLOY && rand() < canary
      const base = v8 ? 0.66 : 0.88
      const score = Math.max(0, Math.min(1, base + (rand() - 0.5) * 0.3))
      points.push({ bucket: b, version: v8 ? "v8" : "v7", score })
    }
  }
  return points
}

const series = (points: ReadonlyArray<Point>, filter: (p: Point) => boolean) =>
  Array.from({ length: BUCKETS }, (_, b) => {
    const xs = points.filter((p) => p.bucket === b && filter(p))
    return xs.length >= 3 ? xs.reduce((n, p) => n + p.score, 0) / xs.length : null
  })

const x = (b: number) => (b / (BUCKETS - 1)) * W
const y = (v: number) => H - ((v - 0.5) / 0.5) * H

const path = (s: ReadonlyArray<number | null>) =>
  s
    .map((v, b) => (v === null ? null : `${x(b)},${y(v)}`))
    .reduce<Array<string>>((acc, pt, i, all) => {
      if (pt) acc.push(`${all[i - 1] ? "L" : "M"}${pt}`)
      return acc
    }, [])
    .join(" ")

const clock = (b: number) => {
  const m = b * BUCKET_MIN
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

export function EvalDrift() {
  const [canary, setCanary] = useState(0.1)
  const [grouped, setGrouped] = useState(false)

  const points = useMemo(() => simulate(canary), [canary])
  const lines = grouped
    ? [
        { id: "v7", color: "#f2ede4", data: series(points, (p) => p.version === "v7") },
        { id: "v8", color: "#ff9a3c", data: series(points, (p) => p.version === "v8") },
      ]
    : [{ id: "all", color: "#f2ede4", data: series(points, () => true) }]

  const firstAlert = lines
    .flatMap((l) => l.data.map((v, b) => ({ v, b, id: l.id })))
    .filter((p) => p.v !== null && p.v < THRESHOLD)
    .sort((a, b) => a.b - b.b)[0] as { b: number; id: string } | undefined

  return (
    <Demo label="Fig. 04" title="A regression hiding in the average" hint="Groundedness, 24h, simulated">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Slider
          label="support-v8 canary share (from 14:00)"
          value={canary}
          min={0.05}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setCanary}
        />
        <div className="flex items-end">
          <Toggle label="Group by app.prompt.version" checked={grouped} onChange={setGrouped} />
        </div>
      </div>

      <svg viewBox={`-8 -8 ${W + 16} ${H + 24}`} className="mt-6 h-auto w-full overflow-visible" role="img" aria-label="Groundedness over time">
        {[0.6, 0.7, 0.9, 1].map((v) => (
          <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="#f2ede4" strokeOpacity={0.06} />
        ))}
        <line x1={0} x2={W} y1={y(THRESHOLD)} y2={y(THRESHOLD)} stroke="#ff5d4d" strokeOpacity={0.6} strokeDasharray="4 4" />
        <text x={W} y={y(THRESHOLD) - 5} textAnchor="end" className="fill-[#ff8f84] font-mono text-[9px]">
          alert &lt; {THRESHOLD}
        </text>
        <line x1={x(DEPLOY)} x2={x(DEPLOY)} y1={0} y2={H} stroke="#ff9a3c" strokeOpacity={0.4} />
        <text x={x(DEPLOY) + 4} y={10} className="fill-ember font-mono text-[9px]">
          deploy support-v8
        </text>
        {lines.map((l) => (
          <path key={l.id} d={path(l.data)} fill="none" stroke={l.color} strokeWidth={1.5} strokeOpacity={0.85} />
        ))}
        {firstAlert && (
          <circle cx={x(firstAlert.b)} cy={y(THRESHOLD)} r={4} fill="#ff5d4d" />
        )}
        {[0, 24, 48, 72, 95].map((b) => (
          <text key={b} x={x(b)} y={H + 16} textAnchor="middle" className="fill-bone/30 font-mono text-[9px]">
            {clock(b)}
          </text>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
        <div className="flex gap-4 text-bone/45">
          {lines.map((l) => (
            <span key={l.id} className="flex items-center gap-1.5">
              <span className="h-px w-4" style={{ background: l.color }} />
              {l.id === "all" ? "all traffic" : `support-${l.id}`}
            </span>
          ))}
        </div>
        <span className={firstAlert ? "text-[#ff8f84]" : "text-bone/40"}>
          {firstAlert
            ? `Alert at ${clock(firstAlert.b)}${grouped ? ` on support-${firstAlert.id}` : ""}`
            : "No alert. The regression is invisible."}
        </span>
      </div>
    </Demo>
  )
}
