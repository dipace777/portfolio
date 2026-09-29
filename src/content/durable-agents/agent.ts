import { Effect, Layer } from "effect"
import { complete } from "./resilient"
import { JournalLive, step } from "./journal"
import type { Kv } from "./journal"

declare const search: (query: string) => Effect.Effect<Array<string>>
declare const postToSlack: (message: {
  text: string
  idempotencyKey: string
}) => Effect.Effect<{ ts: string }>
declare const RedisKv: Layer.Layer<Kv>

export const researchAgent = Effect.fn("agent.research")(function* (
  runId: string,
  question: string
) {
  const plan = yield* step("plan", complete(`Plan research for: ${question}`))
  const sources = yield* step("search", search(plan.text))
  const draft = yield* step(
    "draft",
    complete(`Answer "${question}" using:\n${sources.join("\n")}`)
  )
  yield* step(
    "publish",
    postToSlack({ text: draft.text, idempotencyKey: `${runId}:publish` })
  )
  return draft.text
})

export const run = (runId: string, question: string) =>
  researchAgent(runId, question).pipe(
    Effect.provide(JournalLive(runId).pipe(Layer.provide(RedisKv)))
  )
