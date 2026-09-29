import { useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { RotateCcw, Send, Square } from "lucide-react"
import type { GenUIMessage } from "@/lib/genui/tools"
import { Demo } from "../article"
import { ActionButton } from "../demos/controls"
import { MessageView } from "./tool-views"

const transport = new DefaultChatTransport<GenUIMessage>({ api: "/api/genui" })

export type Prompt = { label: string; text: string }

function RawInput({ messages }: { messages: Array<GenUIMessage> }) {
  const part = messages
    .flatMap((m) => m.parts)
    .reverse()
    .find((p) => p.type.startsWith("tool-"))
  const text =
    part && "input" in part && part.input !== undefined
      ? JSON.stringify(part.input)
      : ""
  const state = part && "state" in part ? part.state : "waiting"
  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-bone/10 bg-ink/60">
      <div className="flex items-center justify-between border-b border-bone/10 px-3 py-2 font-mono text-[10px] tracking-wider text-bone/40 uppercase">
        <span>part.input</span>
        <span className={state === "input-streaming" ? "text-ember" : ""}>
          {state}
        </span>
      </div>
      <pre className="max-h-72 min-h-40 flex-1 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-bone/55">
        {text || "// nothing yet"}
        {state === "input-streaming" && (
          <span className="animate-flicker ml-0.5 inline-block h-3 w-1 bg-ember" />
        )}
      </pre>
    </div>
  )
}

export function GenUIChat({
  label,
  title,
  hint,
  prompts,
  raw = false,
}: {
  label: string
  title: string
  hint?: string
  prompts: ReadonlyArray<Prompt>
  raw?: boolean
}) {
  const { messages, sendMessage, status, stop, setMessages, error } =
    useChat<GenUIMessage>({ transport })
  const busy = status === "submitted" || status === "streaming"
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight })
  }, [messages])

  const ask = (text: string) => {
    if (busy) return
    if (raw) setMessages([])
    void sendMessage({ text })
  }

  const thread = (
    <div
      ref={scroller}
      aria-live="polite"
      className="grid max-h-[32rem] min-h-56 content-start gap-5 overflow-y-auto rounded-lg border border-bone/5 bg-bone/[0.015] p-4"
    >
      {messages.length === 0 ? (
        <p className="self-center text-center text-sm text-bone/35">
          Pick a prompt. The reply streams from a real TanStack Start route.
        </p>
      ) : (
        messages.map((m) => <MessageView key={m.id} message={m} />)
      )}
      {status === "submitted" && (
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-pulse rounded-full bg-bone/40"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      )}
      {error && (
        <p className="text-sm text-[#ff8f84]">Stream failed: {error.message}</p>
      )}
    </div>
  )

  return (
    <Demo label={label} title={title} hint={hint}>
      <div className="flex flex-wrap gap-1.5">
        {prompts.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={busy}
            onClick={() => ask(p.text)}
            className="inline-flex items-center gap-2 rounded-full border border-bone/15 px-3.5 py-1.5 text-left text-[13px] text-bone/70 transition-colors hover:border-ember/50 hover:text-bone disabled:opacity-40"
          >
            <Send className="size-3 text-ember" />
            {p.label}
          </button>
        ))}
      </div>

      <div
        className={`mt-5 grid gap-4 ${raw ? "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" : ""}`}
      >
        {thread}
        {raw && <RawInput messages={messages} />}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] tracking-[0.2em] text-bone/35 uppercase">
          status: <span className={busy ? "text-ember" : ""}>{status}</span>
        </span>
        <div className="flex gap-2">
          {busy ? (
            <ActionButton tone="ghost" onClick={() => void stop()}>
              <Square className="size-3" /> Stop
            </ActionButton>
          ) : (
            <ActionButton
              tone="ghost"
              onClick={() => setMessages([])}
              disabled={!messages.length}
            >
              <RotateCcw className="size-3.5" /> Clear
            </ActionButton>
          )}
        </div>
      </div>
    </Demo>
  )
}
