import { SpanKind, trace } from "@opentelemetry/api"
import type { LanguageModel, ToolSet } from "ai"
import { generateText, isStepCount } from "ai"
import { groundedness } from "@/lib/traces/evals"

declare const model: LanguageModel
declare const tools: ToolSet
declare const search: (q: string) => Promise<Array<{ text: string }>>

const tracer = trace.getTracer("support-bot")

export const answer = (question: string) =>
  tracer.startActiveSpan(
    "answer",
    { kind: SpanKind.INTERNAL, attributes: { "app.prompt.version": "support-v7" } },
    async (span) => {
      try {
        const docs = await tracer.startActiveSpan("retrieve", async (s) => {
          const hits = await search(question)
          s.setAttribute("retrieval.top_k", hits.length)
          s.end()
          return hits
        })

        const result = await generateText({
          model,
          tools,
          system: "Answer from the sources. Cite them as [n].",
          prompt: `${docs.map((d, i) => `[${i + 1}] ${d.text}`).join("\n")}\n\n${question}`,
          stopWhen: isStepCount(3),
          telemetry: { functionId: "support.answer", recordInputs: false },
        })

        const g = groundedness(result.text, docs.length)
        span.setAttributes({
          "gen_ai.evaluation.name": "groundedness",
          "gen_ai.evaluation.score.value": g.score,
          "gen_ai.evaluation.score.label": g.label,
        })
        return result.text
      } finally {
        span.end()
      }
    },
  )
