import { describe, expect, it } from "vitest"
import { Effect, Exit, Fiber } from "effect"
import { fakeProvider, resilient } from "./llm"
import type { Attempt, Behavior, Policy } from "./llm"
import { Journal, amnesiacJournal, memoryJournal, step } from "./workflow"

const policy: Policy = { timeoutMs: 80, baseMs: 10, retries: 3, fallback: true }

const run = async (primary: Array<Behavior>, p: Policy = policy) => {
  const attempts: Array<Attempt> = []
  const record = {
    start: (provider: string, attempt: number) => {
      attempts.push({ id: attempts.length, provider, attempt, start: 0 })
      return attempts.length - 1
    },
    end: (id: number, outcome: Attempt["outcome"]) => {
      attempts[id].outcome = outcome
    },
  }
  const call = resilient(
    fakeProvider("primary", primary, record, 20),
    fakeProvider("fallback", ["ok"], record, 20),
    p
  )
  const exit = await Effect.runPromiseExit(call("hi"))
  return { exit, trail: attempts.map((a) => `${a.provider}:${a.outcome}`) }
}

describe("resilient llm call", () => {
  it("retries rate limits with backoff", async () => {
    const { exit, trail } = await run(["429", "429", "ok"])
    expect(Exit.isSuccess(exit)).toBe(true)
    expect(trail).toEqual(["primary:429", "primary:429", "primary:ok"])
  })

  it("times out a hanging call and retries", async () => {
    const { trail } = await run(["hang", "ok"])
    expect(trail).toEqual(["primary:timeout", "primary:ok"])
  })

  it("does not retry an outage, it falls back", async () => {
    const { exit, trail } = await run(["down"])
    expect(Exit.isSuccess(exit)).toBe(true)
    expect(trail).toEqual(["primary:down", "fallback:ok"])
  })

  it("falls back once retries are exhausted", async () => {
    const { trail } = await run(["malformed"])
    expect(trail).toEqual([
      "primary:malformed",
      "primary:malformed",
      "primary:malformed",
      "primary:malformed",
      "fallback:ok",
    ])
  })

  it("surfaces a typed error without a fallback", async () => {
    const { exit } = await run(["down"], { ...policy, fallback: false })
    expect(Exit.isFailure(exit)).toBe(true)
  })
})

describe("durable steps", () => {
  const workflow = (effects: Array<string>) =>
    Effect.gen(function* () {
      for (const name of ["plan", "search", "publish", "summarize"]) {
        yield* step(
          name,
          Effect.sleep(15).pipe(
            Effect.andThen(Effect.sync(() => effects.push(name)))
          )
        )
      }
    })

  const crashThenResume = async (durable: boolean) => {
    const effects: Array<string> = []
    const store = new Map<string, unknown>()
    const journal = durable ? memoryJournal(store, {}) : amnesiacJournal
    const program = workflow(effects).pipe(
      Effect.provideService(Journal, journal)
    )
    const fiber = Effect.runFork(program)
    await new Promise((r) => setTimeout(r, 55))
    await Effect.runPromise(Fiber.interrupt(fiber))
    await Effect.runPromise(program)
    return effects
  }

  it("replays completed steps after a crash", async () => {
    const effects = await crashThenResume(true)
    expect(effects).toEqual(["plan", "search", "publish", "summarize"])
  })

  it("repeats side effects without a journal", async () => {
    const effects = await crashThenResume(false)
    expect(effects.filter((e) => e === "publish").length).toBe(2)
  })
})
