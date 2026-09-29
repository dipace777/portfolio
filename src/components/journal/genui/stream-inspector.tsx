import { useEffect, useRef, useState } from "react"
import { Play, Square } from "lucide-react"
import { Demo } from "../article"
import { ActionButton, Segmented } from "../demos/controls"

type Row = { at: number; type: string; detail: string }

const prompts = {
  shipment: "track NP-4471",
  incident: "triage the failed logins alert",
  plot: "plot p95 latency",
} as const
type Key = keyof typeof prompts

const tone = (type: string) => {
  if (type.startsWith("text")) return "text-bone/70"
  if (type.startsWith("tool-input")) return "text-ember"
  if (type.startsWith("tool-output")) return "text-glacier"
  return "text-bone/35"
}

const describe = (chunk: Record<string, unknown>) => {
  if (typeof chunk.delta === "string") return JSON.stringify(chunk.delta)
  if (typeof chunk.inputTextDelta === "string")
    return JSON.stringify(chunk.inputTextDelta)
  if (chunk.type === "tool-output-available")
    return chunk.preliminary ? "preliminary" : "final"
  if (typeof chunk.toolName === "string") return chunk.toolName
  return ""
}

export function StreamInspector() {
  const [key, setKey] = useState<Key>("plot")
  const [rows, setRows] = useState<Array<Row>>([])
  const [running, setRunning] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight })
  }, [rows])

  const run = async () => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setRows([])
    setRunning(true)
    const t0 = performance.now()
    try {
      const res = await fetch("/api/genui", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            {
              id: "inspect",
              role: "user",
              parts: [{ type: "text", text: prompts[key] }],
            },
          ],
        }),
      })
      if (!res.body) return
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ""
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        const events = buffer.split("\n\n")
        buffer = events.pop() ?? ""
        const fresh = events
          .map((e) => e.replace(/^data: /, ""))
          .filter((d) => d && d !== "[DONE]")
          .map((d) => {
            const chunk = JSON.parse(d) as Record<string, unknown>
            return {
              at: performance.now() - t0,
              type: String(chunk.type),
              detail: describe(chunk),
            }
          })
        if (fresh.length) setRows((r) => [...r, ...fresh])
      }
    } catch (e) {
      if (!controller.signal.aborted) throw e
    } finally {
      if (abort.current === controller) setRunning(false)
    }
  }

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <Demo label="Fig. 02" title="What's actually on the wire" hint="Raw SSE from /api/genui">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Prompt"
          value={key}
          onChange={setKey}
          options={[
            { value: "plot", label: "plot latency" },
            { value: "shipment", label: "track shipment" },
            { value: "incident", label: "triage incident" },
          ]}
        />
        {running ? (
          <ActionButton
            tone="ghost"
            onClick={() => {
              abort.current?.abort()
              setRunning(false)
            }}
          >
            <Square className="size-3" /> Stop
          </ActionButton>
        ) : (
          <ActionButton onClick={() => void run()}>
            <Play className="size-3.5" /> Stream
          </ActionButton>
        )}
      </div>

      <div
        ref={box}
        className="mt-5 h-72 overflow-y-auto rounded-lg border border-bone/10 bg-ink/60 px-3 py-2 font-mono text-[11px] leading-[1.7]"
      >
        {rows.length === 0 ? (
          <p className="text-bone/35">$ curl -N -X POST /api/genui …</p>
        ) : (
          rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[3.5rem_11rem_minmax(0,1fr)] gap-2">
              <span className="text-bone/25 tabular-nums">
                {Math.round(r.at)}ms
              </span>
              <span className={tone(r.type)}>{r.type}</span>
              <span className="truncate text-bone/45">{r.detail}</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {Object.entries(counts).map(([type, n]) => (
          <span
            key={type}
            className={`rounded-full border border-bone/10 px-2.5 py-1 font-mono text-[10px] ${tone(type)}`}
          >
            {type} ×{n}
          </span>
        ))}
      </div>
    </Demo>
  )
}
