import { Data, Effect, Schedule } from "effect"

export class RateLimited extends Data.TaggedError("RateLimited")<{
  readonly provider: string
}> {}

export class ProviderDown extends Data.TaggedError("ProviderDown")<{
  readonly provider: string
}> {}

export class MalformedOutput extends Data.TaggedError("MalformedOutput")<{
  readonly provider: string
}> {}

export type LlmError = RateLimited | ProviderDown | MalformedOutput

export type Behavior = "ok" | "429" | "hang" | "down" | "malformed"
export type Outcome = Behavior | "timeout" | "stuck"

export type Attempt = {
  id: number
  provider: string
  attempt: number
  start: number
  end?: number
  outcome?: Outcome
}

export type Recorder = {
  start: (provider: string, attempt: number) => number
  end: (id: number, outcome: Outcome) => void
}

export type Policy = {
  timeoutMs: number
  baseMs: number
  retries: number
  fallback: boolean
}

const failure = (behavior: Behavior, provider: string) => {
  switch (behavior) {
    case "429":
      return new RateLimited({ provider })
    case "down":
      return new ProviderDown({ provider })
    default:
      return new MalformedOutput({ provider })
  }
}

export const fakeProvider = (
  provider: string,
  script: ReadonlyArray<Behavior>,
  record: Recorder,
  latencyMs = 420
) => {
  let calls = 0
  return (_prompt: string): Effect.Effect<string, LlmError> =>
    Effect.suspend(() => {
      const attempt = calls++
      const behavior = script[Math.min(attempt, script.length - 1)]
      const id = record.start(provider, attempt)
      const work: Effect.Effect<string, LlmError> =
        behavior === "hang"
          ? Effect.never
          : Effect.sleep(behavior === "ok" ? latencyMs : latencyMs / 2).pipe(
              Effect.andThen(
                behavior === "ok"
                  ? Effect.succeed(`${provider}: answer`)
                  : Effect.fail(failure(behavior, provider))
              )
            )
      return work.pipe(
        Effect.tap(() => Effect.sync(() => record.end(id, "ok"))),
        Effect.tapError(() => Effect.sync(() => record.end(id, behavior))),
        Effect.onInterrupt(() => Effect.sync(() => record.end(id, "timeout")))
      )
    })
}

const isTransient = (e: LlmError | { readonly _tag: "TimeoutError" }) =>
  e._tag !== "ProviderDown"

export const resilient = (
  primary: (prompt: string) => Effect.Effect<string, LlmError>,
  fallback: (prompt: string) => Effect.Effect<string, LlmError>,
  policy: Policy
) => {
  const schedule = Schedule.max([
    Schedule.exponential(policy.baseMs).pipe(Schedule.jittered),
    Schedule.recurs(policy.retries),
  ])
  return (prompt: string) => {
    const attempt = primary(prompt).pipe(
      Effect.timeout(policy.timeoutMs),
      Effect.retry({ schedule, while: isTransient })
    )
    return policy.fallback
      ? attempt.pipe(Effect.catch(() => fallback(prompt)))
      : attempt
  }
}
