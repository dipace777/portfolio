import { trace } from "@opentelemetry/api"
import type { SpanContext } from "@opentelemetry/api"
import { groundedness } from "@/lib/traces/evals"

const tracer = trace.getTracer("support-bot.evals")

export const scoreLater = (
  answer: string,
  sources: number,
  origin: SpanContext
) =>
  tracer.startActiveSpan(
    "evaluate groundedness",
    { root: true, links: [{ context: origin }] },
    (span) => {
      const g = groundedness(answer, sources)
      span.setAttributes({
        "gen_ai.operation.name": "evaluate",
        "gen_ai.evaluation.name": "groundedness",
        "gen_ai.evaluation.score.value": g.score,
        "gen_ai.evaluation.score.label": g.label,
      })
      span.end()
      return g
    }
  )
