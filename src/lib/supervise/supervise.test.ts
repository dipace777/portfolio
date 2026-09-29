import { describe, expect, it } from "vitest"
import { Escalation, run, supervisor } from "./supervisor"
import type { Strategy, SupervisorEvent } from "./supervisor"
import { createWorkers } from "./workers"
import { travelAgent } from "./agent"
import type { AgentStep } from "./agent"

const tick = () => new Promise((r) => setTimeout(r, 0))

const tree = (strategy: Strategy, maxRestarts = 3) => {
  const w = createWorkers()
  const events: Array<SupervisorEvent> = []
  const root = supervisor({
    id: "root",
    strategy,
    maxRestarts,
    children: [w.worker("a"), w.worker("b"), w.worker("c")],
    onEvent: (e) => events.push(e),
  })
  const app = run(root)
  const restarted = () =>
    events
      .filter((e) => e.type === "started")
      .slice(3)
      .map((e) => e.id)
  return { w, events, app, restarted }
}

describe("strategies", () => {
  it("one_for_one restarts only the crashed child", async () => {
    const { w, restarted, app } = tree("one_for_one")
    w.crash("b")
    await tick()
    expect(restarted()).toEqual(["b"])
    app.stop()
  })

  it("one_for_all restarts every child", async () => {
    const { w, restarted, events, app } = tree("one_for_all")
    w.crash("b")
    await tick()
    expect(restarted()).toEqual(["a", "b", "c"])
    expect(
      events.filter((e) => e.type === "terminated").map((e) => e.id)
    ).toEqual(["c", "a"])
    app.stop()
  })

  it("rest_for_one restarts the crashed child and everything after it", async () => {
    const { w, restarted, app } = tree("rest_for_one")
    w.crash("b")
    await tick()
    expect(restarted()).toEqual(["b", "c"])
    app.stop()
  })
})

describe("restart types", () => {
  it("transient children stay down after a normal exit, temporary ones always", async () => {
    const w = createWorkers()
    const events: Array<SupervisorEvent> = []
    const app = run(
      supervisor({
        id: "root",
        strategy: "one_for_one",
        children: [
          w.worker("job", { restart: "transient" }),
          w.worker("probe", { restart: "temporary" }),
        ],
        onEvent: (e) => events.push(e),
      })
    )
    w.quit("job")
    w.crash("probe")
    await tick()
    expect(events.filter((e) => e.type === "started")).toHaveLength(2)
    w.crash("job")
    await tick()
    expect(events.filter((e) => e.type === "started")).toHaveLength(2)
    app.stop()
  })
})

describe("tripwires", () => {
  const plan = [
    "search flights",
    "search hotels",
    "compare",
    "check visa",
    "draft",
    "book",
  ]

  const go = (tripwires: boolean, checkpoints: boolean) =>
    new Promise<{
      steps: Array<AgentStep>
      events: Array<SupervisorEvent>
      done: boolean
    }>((resolve) => {
      const steps: Array<AgentStep> = []
      const events: Array<SupervisorEvent> = []
      let done = false
      const finish = () => {
        app.stop()
        resolve({ steps, events, done })
      }
      const app = run(
        supervisor({
          id: "root",
          strategy: "one_for_one",
          onEvent: (e) => {
            events.push(e)
            if (e.type === "crashed" && !e.reason.startsWith("loop")) finish()
          },
          children: [
            {
              id: "travel",
              restart: "transient",
              start: travelAgent({
                plan,
                checkpoints: checkpoints ? new Map() : null,
                tripwires,
                environment: { poisonAt: 2, poisoned: false },
                maxSteps: 20,
                delayMs: 0,
                onStep: (s) => steps.push(s),
                onDone: () => {
                  done = true
                  setTimeout(finish, 0)
                },
              }),
            },
          ],
        })
      )
    })

  it("without tripwires the poisoned agent loops until its budget runs out", async () => {
    const { steps, done } = await go(false, true)
    expect(done).toBe(false)
    expect(steps).toHaveLength(20)
  })

  it("a tripwire crash plus a checkpoint restart finishes the plan", async () => {
    const { steps, events, done } = await go(true, true)
    expect(done).toBe(true)
    expect(events.find((e) => e.type === "crashed")).toMatchObject({
      reason: "loop: compare ×3",
    })
    const second = steps.filter(
      (s) => s.incarnation === steps.at(-1)?.incarnation
    )
    expect(second[0].step).toBe(2)
    expect(steps.length).toBeLessThan(12)
  })

  it("without checkpoints the restart redoes the finished steps", async () => {
    const { steps, done } = await go(true, false)
    expect(done).toBe(true)
    const second = steps.filter(
      (s) => s.incarnation === steps.at(-1)?.incarnation
    )
    expect(second[0].step).toBe(0)
  })
})

describe("intensity", () => {
  it("gives up after too many restarts and escalates", async () => {
    const { w, app, events } = tree("one_for_one", 2)
    for (let i = 0; i < 3; i++) {
      w.crash("a")
      await tick()
    }
    await expect(app.done).rejects.toBeInstanceOf(Escalation)
    expect(events.find((e) => e.type === "gave_up")).toEqual({
      type: "gave_up",
      id: "root",
      restarts: 3,
    })
    expect(
      events.filter((e) => e.type === "terminated").map((e) => e.id)
    ).toEqual(["c", "b"])
  })

  it("a parent restarts a child supervisor that gave up", async () => {
    const w = createWorkers()
    const events: Array<SupervisorEvent> = []
    const onEvent = (e: SupervisorEvent) => events.push(e)
    const app = run(
      supervisor({
        id: "root",
        strategy: "one_for_one",
        onEvent,
        children: [
          w.worker("store"),
          supervisor({
            id: "tools",
            strategy: "one_for_one",
            maxRestarts: 1,
            onEvent,
            children: [w.worker("search")],
          }),
        ],
      })
    )
    w.crash("search")
    await tick()
    w.crash("search")
    await tick()
    await tick()
    expect(events.map((e) => `${e.type}:${e.id}`)).toEqual(
      expect.arrayContaining([
        "gave_up:tools",
        "crashed:tools",
        "started:tools",
      ])
    )
    expect(
      events.filter((e) => e.type === "started" && e.id === "store")
    ).toHaveLength(1)
    app.stop()
  })
})
