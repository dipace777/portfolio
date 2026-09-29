import { useRef, useState } from "react"
import { motion } from "motion/react"
import { Play } from "lucide-react"
import { streamBriefing } from "@/lib/genui/briefing"
import type { BriefingCard } from "@/lib/genui/briefing-stream"
import { Demo } from "../article"
import { ActionButton } from "../demos/controls"

type Arrived = BriefingCard & { at: number }

const kindStyle: Record<BriefingCard["kind"], string> = {
  metric: "border-bone/10",
  alert: "border-[#ff5d4d]/40 bg-[#ff5d4d]/[0.04]",
  note: "border-ember/30 bg-ember/[0.04]",
}

export function BriefingDemo() {
  const [cards, setCards] = useState<Array<Arrived>>([])
  const [running, setRunning] = useState(false)
  const runs = useRef(0)

  const run = async () => {
    const id = ++runs.current
    setCards([])
    setRunning(true)
    const t0 = performance.now()
    try {
      for await (const card of await streamBriefing()) {
        if (runs.current !== id) return
        setCards((c) => [...c, { ...card, at: performance.now() - t0 }])
      }
    } finally {
      if (runs.current === id) setRunning(false)
    }
  }

  return (
    <Demo label="Fig. 05" title="A dashboard, not a chat" hint="Streaming server function">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] text-bone/45">
          await streamBriefing() → AsyncIterable&lt;BriefingCard&gt;
        </p>
        <ActionButton onClick={() => void run()} disabled={running}>
          <Play className="size-3.5" /> {cards.length ? "Again" : "Stream briefing"}
        </ActionButton>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => {
          const c = cards[i] as Arrived | undefined
          if (!c) {
            return (
              <div
                key={i}
                className={`min-h-36 rounded-xl border border-dashed border-bone/10 p-4 ${
                  running && i === cards.length ? "animate-pulse bg-bone/[0.03]" : ""
                }`}
              />
            )
          }
          return (
            <motion.article
              key={`${c.title}-${runs.current}`}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`min-h-36 rounded-xl border p-4 ${kindStyle[c.kind]}`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase">
                <span>{c.title}</span>
                <span className="tabular-nums">+{Math.round(c.at)}ms</span>
              </div>
              <p className="mt-3 font-display text-3xl text-bone">
                {c.value}
                {c.delta && (
                  <span
                    className={`ml-2 font-mono text-xs ${
                      c.kind === "alert" ? "text-[#ff8f84]" : "text-glacier"
                    }`}
                  >
                    {c.delta}
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-bone/55">{c.body}</p>
            </motion.article>
          )
        })}
      </div>
    </Demo>
  )
}
