import { Context, Effect, Layer, Option } from "effect"

export class Journal extends Context.Service<
  Journal,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<unknown>>
    readonly put: (key: string, value: unknown) => Effect.Effect<void>
  }
>()("Journal") {}

export const step = <A, E, R>(name: string, run: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const journal = yield* Journal
    const saved = yield* journal.get(name)
    if (Option.isSome(saved)) return saved.value as A

    const value = yield* run
    yield* journal.put(name, value)
    return value
  }).pipe(Effect.withSpan(`step.${name}`))

export class Kv extends Context.Service<
  Kv,
  {
    readonly get: (key: string) => Effect.Effect<string | undefined>
    readonly set: (key: string, value: string) => Effect.Effect<void>
  }
>()("Kv") {}

export const JournalLive = (runId: string) =>
  Layer.effect(
    Journal,
    Effect.gen(function* () {
      const kv = yield* Kv
      return Journal.of({
        get: (key) =>
          kv
            .get(`${runId}:${key}`)
            .pipe(
              Effect.map((v) =>
                v === undefined ? Option.none() : Option.some(JSON.parse(v))
              )
            ),
        put: (key, value) => kv.set(`${runId}:${key}`, JSON.stringify(value)),
      })
    })
  )
