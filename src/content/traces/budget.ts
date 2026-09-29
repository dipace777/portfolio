import { metrics, trace } from "@opentelemetry/api"
import { fitToBudget } from "@/lib/traces/budget"
import type { Chunk } from "@/lib/traces/budget"

const meter = metrics.getMeter("support-bot")

const tokenUsage = meter.createHistogram("gen_ai.client.token.usage", {
  unit: "{token}",
  advice: {
    explicitBucketBoundaries: [1024, 2048, 4096, 8192, 16384, 32768, 65536],
  },
})

export const withinBudget = (
  chunks: ReadonlyArray<Chunk>,
  { budget, reserved, route }: { budget: number; reserved: number; route: string },
) => {
  const fit = fitToBudget(chunks, { budget, reserved })
  const span = trace.getActiveSpan()

  if (fit.dropped > 0) {
    span?.addEvent("budget.trimmed", {
      "budget.tokens": budget,
      "budget.dropped_chunks": fit.dropped,
    })
  }
  if (fit.tokens > budget) {
    span?.addEvent("budget.exceeded", { "budget.tokens": budget })
  }

  tokenUsage.record(fit.tokens, {
    "gen_ai.token.type": "input",
    "gen_ai.operation.name": "chat",
    "http.route": route,
  })
  return fit.kept
}
