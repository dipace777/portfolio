import { motion } from "motion/react"
import { AlertTriangle, Check, Package, ShieldAlert } from "lucide-react"
import type { GenUIMessage } from "@/lib/genui/tools"

type Part = GenUIMessage["parts"][number]
type ToolPart<T extends Part["type"]> = Extract<Part, { type: T }>

const card =
  "overflow-hidden rounded-xl border border-bone/10 bg-ink/70 text-left"

function Shimmer({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded bg-bone/10 ${className}`} />
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-[#ff5d4d]/30 bg-[#ff5d4d]/5 px-3 py-2 text-sm text-[#ff8f84]">
      <AlertTriangle className="size-4" /> {text}
    </p>
  )
}

export function ShipmentView({ part }: { part: ToolPart<"tool-trackShipment"> }) {
  if (part.state === "output-error") return <ErrorLine text={part.errorText} />
  if (part.state !== "output-available") {
    return (
      <div className={`${card} p-4`}>
        <div className="flex items-center gap-3">
          <Package className="size-4 text-ember" />
          <span className="font-mono text-xs text-bone/60">
            Looking up {part.input?.trackingId ?? "…"}
          </span>
        </div>
        <Shimmer className="mt-4 h-2 w-full" />
        <div className="mt-4 grid gap-2">
          <Shimmer className="h-3 w-2/3" />
          <Shimmer className="h-3 w-1/2" />
        </div>
      </div>
    )
  }
  const s = part.output
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={card}
    >
      <div className="flex items-start justify-between gap-4 border-b border-bone/10 p-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-bone/40 uppercase">
            {s.carrier} · {s.trackingId}
          </p>
          <p className="mt-1 font-display text-2xl text-bone">
            {s.origin} <span className="text-bone/35">→</span> {s.destination}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-glacier/15 px-2.5 py-1 font-mono text-[10px] tracking-wider text-glacier uppercase">
          {s.status}
        </span>
      </div>
      <div className="p-4">
        <div className="h-1.5 rounded-full bg-bone/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${s.progress * 100}%` }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-ember to-ember-soft"
          />
        </div>
        <ol className="mt-4 grid gap-2.5">
          {s.checkpoints.map((c, i) => (
            <motion.li
              key={c.place}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex size-4 items-center justify-center rounded-full border ${
                    c.done
                      ? "border-ember bg-ember/20 text-ember"
                      : "border-bone/20 text-transparent"
                  }`}
                >
                  <Check className="size-2.5" />
                </span>
                <span className={c.done ? "text-bone" : "text-bone/45"}>
                  {c.place}
                </span>
              </span>
              <span className="font-mono text-[11px] text-bone/40">{c.time}</span>
            </motion.li>
          ))}
        </ol>
        <p className="mt-4 font-mono text-[11px] tracking-wider text-bone/50">
          ETA <span className="text-ember-soft">{s.eta}</span>
        </p>
      </div>
    </motion.div>
  )
}

const stages = ["scanning", "correlating", "done"] as const

export function IncidentView({
  part,
}: {
  part: ToolPart<"tool-triageIncident">
}) {
  if (part.state === "output-error") return <ErrorLine text={part.errorText} />
  const out = part.state === "output-available" ? part.output : null
  const stage = out?.stage ?? "queued"
  const at = stages.indexOf(stage as (typeof stages)[number])
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3 border-b border-bone/10 p-4">
        <span className="flex items-center gap-2.5">
          <ShieldAlert className="size-4 text-ember" />
          <span className="font-mono text-xs text-bone/70">
            {part.input?.alertId ?? "…"} · last {part.input?.window ?? "…"}
          </span>
        </span>
        {part.state === "output-available" && part.preliminary && (
          <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-ember uppercase">
            <span className="animate-flicker size-1.5 rounded-full bg-ember" />
            live
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-1.5">
          {stages.map((s, i) => (
            <div key={s}>
              <div
                className={`h-1 rounded-full transition-colors duration-500 ${
                  i < at || stage === "done"
                    ? "bg-ember"
                    : i === at
                      ? "animate-pulse bg-ember/60"
                      : "bg-bone/10"
                }`}
              />
              <p className="mt-1.5 font-mono text-[10px] tracking-wider text-bone/40 uppercase">
                {s === "done" ? "verdict" : s}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 font-display text-3xl text-bone tabular-nums">
          {(out?.events ?? 0).toLocaleString()}
          <span className="ml-2 font-sans text-sm text-bone/40">
            events scanned
          </span>
        </p>
        <ul className="mt-3 grid gap-2">
          {(out?.findings ?? []).map((f) => (
            <motion.li
              key={f.rule}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 rounded-lg border border-bone/10 px-3 py-2 text-sm"
            >
              <span className="text-bone/80">{f.rule}</span>
              <span
                className={`font-mono text-[10px] tracking-wider uppercase ${
                  f.severity === "high" ? "text-[#ff8f84]" : "text-bone/40"
                }`}
              >
                {f.severity}
              </span>
            </motion.li>
          ))}
        </ul>
        {out?.verdict && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 rounded-lg bg-ember/10 px-3 py-2 text-sm text-ember-soft"
          >
            {out.verdict}
          </motion.p>
        )}
      </div>
    </div>
  )
}

const W = 480
const H = 150

export function PlotView({ part }: { part: ToolPart<"tool-plotMetric"> }) {
  if (part.state === "output-error") return <ErrorLine text={part.errorText} />
  const input = part.input
  const points = (input?.points ?? []).filter(
    (p): p is { t: string; v: number } =>
      typeof p?.v === "number" && typeof p.t === "string",
  )
  const threshold = input?.threshold
  const max = Math.max(500, ...points.map((p) => p.v))
  const x = (i: number) => (i / 23) * W
  const y = (v: number) => H - (v / max) * H
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join(" ")
  const done = part.state === "output-available"

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3 border-b border-bone/10 p-4">
        <p className="font-mono text-xs text-bone/70">
          {input?.title ?? <Shimmer className="h-3 w-40" />}
        </p>
        <p className="font-mono text-[10px] tracking-wider text-bone/40 uppercase">
          {points.length}/24 points
        </p>
      </div>
      <div className="p-4">
        <svg
          viewBox={`-6 -6 ${W + 12} ${H + 12}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={input?.title ?? "chart"}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <line
              key={i}
              x1={0}
              x2={W}
              y1={(H / 3) * i}
              y2={(H / 3) * i}
              stroke="rgba(237,230,218,0.06)"
            />
          ))}
          {typeof threshold === "number" && (
            <g>
              <line
                x1={0}
                x2={W}
                y1={y(threshold)}
                y2={y(threshold)}
                stroke="#ff5d4d"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
              <text
                x={W}
                y={y(threshold) - 6}
                textAnchor="end"
                className="fill-[#ff8f84] font-mono text-[10px]"
              >
                {threshold}
                {input?.unit}
              </text>
            </g>
          )}
          {points.length > 1 && (
            <>
              <path
                d={`${line} L${x(points.length - 1)},${H} L0,${H} Z`}
                fill="url(#area)"
              />
              <path d={line} fill="none" stroke="#ffc27a" strokeWidth={2} />
            </>
          )}
          {points.map((p, i) => (
            <circle
              key={p.t}
              cx={x(i)}
              cy={y(p.v)}
              r={threshold !== undefined && p.v > threshold ? 3.5 : 2}
              fill={threshold !== undefined && p.v > threshold ? "#ff5d4d" : "#ffc27a"}
            />
          ))}
          <defs>
            <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff9a3c" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#ff9a3c" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
        <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-bone/35">
          <span>00:00</span>
          {done ? (
            <span className="text-bone/60">
              {part.output.breaches} breaches · peak {part.output.peak}
              {input?.unit}
            </span>
          ) : (
            <span className="text-ember">model is still writing…</span>
          )}
          <span>23:00</span>
        </div>
      </div>
    </div>
  )
}

export function MessageView({ message }: { message: GenUIMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-br-md bg-bone/10 px-4 py-2.5 text-sm text-bone">
          {message.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
        </p>
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      {message.parts.map((part, i) => {
        switch (part.type) {
          case "text":
            return (
              <p key={i} className="text-[15px] leading-relaxed text-bone/80">
                {part.text}
                {part.state === "streaming" && (
                  <span className="animate-flicker ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-ember" />
                )}
              </p>
            )
          case "tool-trackShipment":
            return <ShipmentView key={part.toolCallId} part={part} />
          case "tool-triageIncident":
            return <IncidentView key={part.toolCallId} part={part} />
          case "tool-plotMetric":
            return <PlotView key={part.toolCallId} part={part} />
          default:
            return null
        }
      })}
    </div>
  )
}
