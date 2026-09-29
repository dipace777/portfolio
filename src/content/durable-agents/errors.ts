import { Data, Effect, Schema } from "effect"

export class RateLimited extends Data.TaggedError("RateLimited")<{
  readonly retryAfterMs: number
}> {}

export class ProviderDown extends Data.TaggedError("ProviderDown")<{
  readonly provider: string
}> {}

export class MalformedOutput extends Data.TaggedError("MalformedOutput")<{
  readonly raw: unknown
}> {}

const Completion = Schema.Struct({
  text: Schema.String,
  tokens: Schema.Number,
})

export const makeProvider = (provider: string, url: string) =>
  Effect.fn("llm.complete")(function* (prompt: string) {
    const res = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(url, {
          method: "POST",
          body: JSON.stringify({ prompt }),
          signal,
        }),
      catch: () => new ProviderDown({ provider }),
    })

    if (res.status === 429) {
      const seconds = Number(res.headers.get("retry-after") ?? 1)
      return yield* new RateLimited({ retryAfterMs: seconds * 1000 })
    }
    if (!res.ok) return yield* new ProviderDown({ provider })

    const raw = yield* Effect.tryPromise({
      try: () => res.json(),
      catch: () => new MalformedOutput({ raw: null }),
    })
    return yield* Schema.decodeUnknownEffect(Completion)(raw).pipe(
      Effect.mapError(() => new MalformedOutput({ raw }))
    )
  })
