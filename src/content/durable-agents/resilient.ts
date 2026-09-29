import { Effect } from "effect"
import { makeProvider } from "./errors"
import { isRetryable, retryPolicy } from "./retry"

const primary = makeProvider("anthropic", "https://llm.internal/anthropic")
const fallback = makeProvider("openai", "https://llm.internal/openai")

export const complete = (prompt: string) =>
  primary(prompt).pipe(
    Effect.timeout("20 seconds"),
    Effect.retry({ schedule: retryPolicy, while: isRetryable }),
    Effect.catch(() => fallback(prompt).pipe(Effect.timeout("30 seconds"))),
    Effect.withSpan("llm.resilient", {
      attributes: { "prompt.chars": prompt.length },
    })
  )
