import { Duration, Effect, Schedule } from "effect"
import type { Cause } from "effect"
import type { MalformedOutput, ProviderDown, RateLimited } from "./errors"

type CallError =
  RateLimited | ProviderDown | MalformedOutput | Cause.TimeoutError

export const isRetryable = (error: CallError) => error._tag !== "ProviderDown"

export const retryPolicy = Schedule.exponential("250 millis").pipe(
  Schedule.jittered,
  Schedule.setInputType<CallError>(),
  Schedule.modifyDelay(({ input, duration }) =>
    Effect.succeed(
      input._tag === "RateLimited"
        ? Duration.max(duration, Duration.millis(input.retryAfterMs))
        : Duration.min(duration, Duration.seconds(8))
    )
  ),
  (backoff) => Schedule.max([backoff, Schedule.recurs(4)])
)
