import { SpanKind, SpanStatusCode } from "@opentelemetry/api"
import type { Span } from "@opentelemetry/api"
import { embed, generateText, isStepCount, tool } from "ai"
import { z } from "zod"
import { costUsd, fitToBudget } from "./budget"
import type { Chunk } from "./budget"
import { groundedness } from "./evals"
import { scriptedChat, scriptedEmbedder } from "./models"
import type { ModelScript } from "./models"
import { aiTelemetry, collector, tracer } from "./telemetry"

export const scenarios = [
  "healthy",
  "slow-provider",
  "tool-error",
  "context-bloat",
  "ungrounded",
] as const
export type Scenario = (typeof scenarios)[number]

const QUESTION = "Why was order NP-4471 charged twice?"
const SYSTEM_TOKENS = 850
const BUDGET = 8000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const corpus: ReadonlyArray<Chunk> = Array.from({ length: 32 }, (_, i) => ({
  id: `kb-${String(i + 1).padStart(3, "0")}`,
  tokens: 380 + ((i * 37) % 90),
  score: Math.round((0.92 - i * 0.021) * 100) / 100,
}))

const grounded =
  "You were charged once. The second line is a pre-authorisation hold that drops off within 5 business days [1]. Order NP-4471 shows a single captured payment of NPR 12,400 [2]."

const scripts: Record<Scenario, ModelScript & { topK: number }> = {
  healthy: {
    topK: 6,
    latencyMs: 640,
    inputTokens: 3480,
    outputTokens: 162,
    answer: grounded,
    callTool: { name: "lookupOrder", input: { orderId: "NP-4471" } },
  },
  "slow-provider": {
    topK: 6,
    latencyMs: 2300,
    inputTokens: 3480,
    outputTokens: 162,
    answer: grounded,
    callTool: { name: "lookupOrder", input: { orderId: "NP-4471" } },
  },
  "tool-error": {
    topK: 6,
    latencyMs: 640,
    inputTokens: 3480,
    outputTokens: 96,
    answer:
      "I couldn't reach the orders system just now. Duplicate-looking charges are usually a pre-authorisation hold that drops off within 5 business days [1].",
    callTool: { name: "lookupOrder", input: { orderId: "NP-4471" } },
  },
  "context-bloat": {
    topK: 32,
    latencyMs: 1350,
    inputTokens: 14610,
    outputTokens: 171,
    answer: grounded,
    callTool: { name: "lookupOrder", input: { orderId: "NP-4471" } },
  },
  ungrounded: {
    topK: 6,
    latencyMs: 640,
    inputTokens: 3480,
    outputTokens: 118,
    answer:
      "Our billing system double-charged you because of a known bug. A refund of NPR 24,800 has been issued. It should arrive today.",
  },
}

const retrieve = (query: string, topK: number) =>
  tracer.startActiveSpan("retrieve support_docs", async (span) => {
    try {
      await embed({
        model: scriptedEmbedder,
        value: query,
        telemetry: {
          isEnabled: true,
          functionId: "retrieve.embed",
          integrations: [aiTelemetry],
        },
      })
      const hits = await tracer.startActiveSpan(
        "SELECT support_docs",
        {
          kind: SpanKind.CLIENT,
          attributes: {
            "db.system.name": "postgresql",
            "db.operation.name": "SELECT",
            "db.collection.name": "support_docs",
            "db.query.summary": "ORDER BY embedding <=> $1 LIMIT $2",
          },
        },
        async (db) => {
          await sleep(40 + topK * 2)
          const rows = corpus.slice(0, topK)
          db.setAttribute("db.response.returned_rows", rows.length)
          db.end()
          return rows
        },
      )
      span.setAttributes({
        "retrieval.top_k": topK,
        "retrieval.tokens": hits.reduce((n, c) => n + c.tokens, 0),
        "retrieval.min_score": hits.at(-1)?.score ?? 0,
      })
      return hits
    } finally {
      span.end()
    }
  })

const lookupOrder = (failing: boolean) =>
  tool({
    description: "Fetch an order and its payment events.",
    inputSchema: z.object({ orderId: z.string() }),
    execute: async ({ orderId }) => {
      await sleep(failing ? 1500 : 120)
      if (failing) throw new Error("orders-db: statement timeout after 1500ms")
      return { orderId, captured: 1, holds: 1, amount: "NPR 12,400" }
    },
  })

const guardrail = (answer: string) =>
  tracer.startActiveSpan("guardrail pii", (span) => {
    const emails = answer.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []
    span.setAttributes({
      "guardrail.name": "pii",
      "guardrail.matches": emails.length,
      "guardrail.action": emails.length ? "redact" : "allow",
    })
    span.end()
  })

const evaluate = (answer: string, sources: number) =>
  tracer.startActiveSpan("evaluate groundedness", (span) => {
    const g = groundedness(answer, sources)
    span.setAttributes({
      "gen_ai.operation.name": "evaluate",
      "gen_ai.evaluation.name": "groundedness",
      "gen_ai.evaluation.score.value": g.score,
      "gen_ai.evaluation.score.label": g.label,
      "eval.sentences": g.sentences,
      "eval.cited": g.cited,
    })
    if (g.label === "fail") {
      span.addEvent("gen_ai.evaluation.result", {
        "gen_ai.evaluation.name": "groundedness",
        "gen_ai.evaluation.explanation": `${g.cited} of ${g.sentences} sentences cite a retrieved source`,
      })
    }
    span.end()
    return g
  })

const handle = async (root: Span, scenario: Scenario) => {
  const script = scripts[scenario]
  const chunks = await retrieve(QUESTION, script.topK)

  const fit = fitToBudget(chunks, { budget: BUDGET, reserved: SYSTEM_TOKENS })
  const estimated = SYSTEM_TOKENS + chunks.reduce((n, c) => n + c.tokens, 0)
  if (estimated > BUDGET) {
    root.addEvent("budget.exceeded", {
      "budget.tokens": BUDGET,
      "budget.estimated": estimated,
      "budget.would_drop": fit.dropped,
    })
  }

  const result = await generateText({
    model: scriptedChat(script),
    system: "You are Upaya Freight's support assistant. Cite sources as [n].",
    prompt: QUESTION,
    tools: { lookupOrder: lookupOrder(scenario === "tool-error") },
    stopWhen: isStepCount(3),
    telemetry: {
      isEnabled: true,
      functionId: "support.answer",
      recordInputs: false,
      recordOutputs: false,
      integrations: [aiTelemetry],
    },
  })

  guardrail(result.text)
  const g = evaluate(result.text, chunks.length)

  const input = result.totalUsage.inputTokens ?? 0
  const output = result.totalUsage.outputTokens ?? 0
  root.setAttributes({
    "app.prompt.version": "support-v7",
    "gen_ai.usage.input_tokens": input,
    "gen_ai.usage.output_tokens": output,
    "app.llm.cost_usd": Math.round(costUsd(input, output) * 1e5) / 1e5,
    "app.eval.groundedness": g.score,
    "http.response.status_code": 200,
  })
  return result.text
}

export const runPipeline = async (scenario: Scenario) => {
  const traceId = await tracer.startActiveSpan(
    "POST /api/answer",
    {
      kind: SpanKind.SERVER,
      attributes: {
        "http.request.method": "POST",
        "http.route": "/api/answer",
        "app.scenario": scenario,
      },
    },
    async (root) => {
      const id = root.spanContext().traceId
      collector.watch(id)
      try {
        await handle(root, scenario)
      } catch (e) {
        root.recordException(e as Error)
        root.setStatus({ code: SpanStatusCode.ERROR, message: String(e) })
      } finally {
        root.end()
      }
      return id
    },
  )
  return collector.take(traceId)
}
