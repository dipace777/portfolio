import { Context, Effect, Option } from "effect"

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

export const memoryJournal = (
  store: Map<string, unknown>,
  hooks: { onReplay?: (key: string) => void; onSave?: (key: string) => void }
) =>
  Journal.of({
    get: (key) =>
      Effect.sync(() => {
        if (!store.has(key)) return Option.none()
        hooks.onReplay?.(key)
        return Option.some(store.get(key))
      }),
    put: (key, value) =>
      Effect.sync(() => {
        store.set(key, value)
        hooks.onSave?.(key)
      }),
  })

export const amnesiacJournal = Journal.of({
  get: () => Effect.succeed(Option.none()),
  put: () => Effect.void,
})
