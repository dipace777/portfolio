import { simulateReadableStream } from "ai"
import type {
  LanguageModelV4,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider"

type Scenario = "shipment" | "incident" | "plot" | "briefing" | "chat"

const usage = (output: number) => ({
  inputTokens: {
    total: 180,
    noCache: 180,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: output, text: output, reasoning: undefined },
})

const lastUserText = (prompt: LanguageModelV4Prompt) => {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const m = prompt[i]
    if (m.role === "user") {
      return m.content
        .map((p) => (p.type === "text" ? p.text : ""))
        .join(" ")
        .toLowerCase()
    }
  }
  return ""
}

const toolOutput = (prompt: LanguageModelV4Prompt): unknown => {
  const last = prompt.at(-1)
  if (last?.role !== "tool") return undefined
  const part = last.content.find((p) => p.type === "tool-result")
  return part && part.output.type === "json" ? part.output.value : undefined
}

const pick = (text: string): Scenario => {
  if (/ship|track|parcel|np-/.test(text)) return "shipment"
  if (/incident|triage|alert|login|breach/.test(text)) return "incident"
  if (/plot|chart|latency|graph|p95/.test(text)) return "plot"
  if (/briefing/.test(text)) return "briefing"
  return "chat"
}

const words = (text: string) => text.match(/\S+\s*/g) ?? []
const slices = (text: string, size: number) =>
  Array.from({ length: Math.ceil(text.length / size) }, (_, i) =>
    text.slice(i * size, i * size + size),
  )

const textParts = (id: string, text: string): Array<LanguageModelV4StreamPart> => [
  { type: "text-start", id },
  ...words(text).map((delta) => ({ type: "text-delta" as const, id, delta })),
  { type: "text-end", id },
]

const toolParts = (
  id: string,
  toolName: string,
  input: unknown,
  sliceSize: number,
): Array<LanguageModelV4StreamPart> => {
  const json = JSON.stringify(input)
  return [
    { type: "tool-input-start", id, toolName },
    ...slices(json, sliceSize).map((delta) => ({
      type: "tool-input-delta" as const,
      id,
      delta,
    })),
    { type: "tool-input-end", id },
    { type: "tool-call", toolCallId: id, toolName, input: json },
  ]
}

const latency = () => {
  const base = 250
  return Array.from({ length: 24 }, (_, h) => {
    const wave = 40 * Math.sin((h / 24) * Math.PI * 2 - 1.2)
    const spike = h === 14 || h === 15 ? 190 - (h - 14) * 70 : 0
    return {
      t: `${String(h).padStart(2, "0")}:00`,
      v: Math.round(base + wave + spike + ((h * 37) % 23)),
    }
  })
}

const callId = (name: string) =>
  `call_${name}_${Math.random().toString(36).slice(2, 8)}`

const briefing = [
  {
    kind: "metric",
    title: "Agent runs · 24h",
    value: "12,408",
    delta: "+18%",
    body: "Up after the pricing-page launch. Success rate steady at 99.2%.",
  },
  {
    kind: "alert",
    title: "Token spend",
    value: "$412",
    delta: "+64%",
    body: "One tenant's summarizer is looping on retries. Cap it at 3.",
  },
  {
    kind: "metric",
    title: "p95 first token",
    value: "640 ms",
    delta: "-120 ms",
    body: "Prompt caching on the system prompt is paying off.",
  },
  {
    kind: "note",
    title: "Suggested next step",
    value: "Evals",
    delta: "",
    body: "Triage accuracy dipped on Tuesday's model bump. Re-run the golden set.",
  },
]

const opening: Record<Scenario, () => Array<LanguageModelV4StreamPart>> = {
  shipment: () => [
    ...textParts("t0", "Pulling live tracking for NP-4471. "),
    ...toolParts(callId("ship"), "trackShipment", { trackingId: "NP-4471" }, 6),
  ],
  incident: () => [
    ...textParts(
      "t0",
      "On it. Scanning the last 24 hours of auth events for that alert. ",
    ),
    ...toolParts(
      callId("triage"),
      "triageIncident",
      { alertId: "ALR-2291", window: "24h" },
      6,
    ),
  ],
  plot: () => [
    ...textParts("t0", "Here's p95 latency for checkout over the last day. "),
    ...toolParts(
      callId("plot"),
      "plotMetric",
      {
        title: "checkout · p95 latency",
        unit: "ms",
        threshold: 380,
        points: latency(),
      },
      9,
    ),
  ],
  briefing: () => {
    const json = JSON.stringify({ elements: briefing })
    return [
      { type: "text-start", id: "t0" },
      ...slices(json, 7).map((delta) => ({
        type: "text-delta" as const,
        id: "t0",
        delta,
      })),
      { type: "text-end", id: "t0" },
    ]
  },
  chat: () =>
    textParts(
      "t0",
      "I'm a scripted demo model with three tools: shipment tracking, incident triage and metric charts. Try asking me to track NP-4471, triage the failed-logins alert, or plot p95 latency.",
    ),
}

const followUp = (scenario: Scenario, output: unknown): string => {
  const o = (output ?? {}) as Record<string, unknown>
  switch (scenario) {
    case "shipment":
      return `It cleared the Raxaul border this afternoon and is on schedule for ${String(o.eta ?? "Oct 2")}. Next checkpoint is the Lucknow depot tonight.`
    case "incident":
      return "This is credential stuffing, not a targeted attack: one password sprayed across 212 accounts from three networks. I'd block those ASNs at the edge now and force resets for the affected users."
    case "briefing":
      return ""
    case "plot":
      return `Latency breached the 380 ms threshold ${String(o.breaches ?? 0)} times, all around 14:00–15:00, peaking at ${String(o.peak ?? "")} ms. That lines up with the 14:05 deploy; worth a look at its query plan.`
    default:
      return ""
  }
}

export const scriptedModel: LanguageModelV4 = {
  specificationVersion: "v4",
  provider: "journal",
  modelId: "scripted-genui",
  supportedUrls: {},
  doGenerate: () => {
    throw new Error("scripted-genui only streams")
  },
  doStream: async ({ prompt }) => {
    const scenario = pick(lastUserText(prompt))
    const output = toolOutput(prompt)
    const isFollowUp = prompt.at(-1)?.role === "tool"
    const body = isFollowUp
      ? textParts("t1", followUp(scenario, output))
      : opening[scenario]()
    const calledTool = body.some((p) => p.type === "tool-call")
    const chunks: Array<LanguageModelV4StreamPart> = [
      { type: "stream-start", warnings: [] },
      ...body,
      {
        type: "finish",
        finishReason: {
          unified: calledTool ? "tool-calls" : "stop",
          raw: undefined,
        },
        usage: usage(body.length),
      },
    ]
    return {
      stream: simulateReadableStream({
        chunks,
        initialDelayInMs: 380,
        chunkDelayInMs: 32,
      }),
    }
  },
}
