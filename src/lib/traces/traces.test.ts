import { describe, expect, it } from "vitest"
import { fitToBudget } from "./budget"
import { groundedness } from "./evals"
import { runPipeline } from "./pipeline"
import {
  headSampled,
  isInteresting,
  syntheticTraces,
  tailSampled,
} from "./sampling"
import type { TailPolicy } from "./sampling"

const byName = (spans: Awaited<ReturnType<typeof runPipeline>>["spans"]) =>
  (name: string) => spans.filter((s) => s.name.startsWith(name))

describe("pipeline traces", () => {
  it("nests AI SDK spans under the request span in one trace", async () => {
    const { spans } = await runPipeline("healthy")
    const find = byName(spans)
    const [root] = find("POST /api/answer")
    expect(root.parent).toBeNull()
    const [agent] = find("invoke_agent")
    expect(agent.parent).toBe(root.id)
    expect(agent.attributes["gen_ai.usage.input_tokens"]).toBeGreaterThan(0)
    expect(find("chat")).toHaveLength(2)
    expect(find("execute_tool lookupOrder")[0].status.code).toBe(0)
    expect(find("embeddings").length).toBeGreaterThan(0)
    expect(spans.every((s) => s.parent === null || spans.some((p) => p.id === s.parent))).toBe(true)
  })

  it("records a failed tool while the request still returns 200", async () => {
    const { spans } = await runPipeline("tool-error")
    const find = byName(spans)
    const [tool] = find("execute_tool")
    expect(tool.status.code).toBe(2)
    expect(tool.events[0].attributes).not.toHaveProperty("exception.stacktrace")
    const [root] = find("POST /api/answer")
    expect(root.status.code).toBe(0)
    expect(root.attributes["http.response.status_code"]).toBe(200)
  })

  it("flags context bloat and ungrounded answers", async () => {
    const bloat = await runPipeline("context-bloat")
    const root = bloat.spans.find((s) => s.parent === null)
    expect(root?.events.map((e) => e.name)).toContain("budget.exceeded")

    const ungrounded = await runPipeline("ungrounded")
    const evalSpan = ungrounded.spans.find((s) => s.name === "evaluate groundedness")
    expect(evalSpan?.attributes["gen_ai.evaluation.score.label"]).toBe("fail")
  })
})

describe("groundedness", () => {
  it("scores the share of sentences citing a real source", () => {
    expect(groundedness("A [1]. B [2].", 2).score).toBe(1)
    expect(groundedness("A [1]. B.", 2)).toMatchObject({ score: 0.5, label: "fail" })
    expect(groundedness("A [9].", 2).score).toBe(0)
  })
})

describe("fitToBudget", () => {
  it("keeps the highest scoring chunks that fit", () => {
    const chunks = [
      { id: "a", tokens: 400, score: 0.5 },
      { id: "b", tokens: 400, score: 0.9 },
      { id: "c", tokens: 400, score: 0.7 },
    ]
    const fit = fitToBudget(chunks, { budget: 1000, reserved: 150 })
    expect(fit.kept.map((c) => c.id)).toEqual(["b", "c"])
    expect(fit.dropped).toBe(1)
    expect(fit.tokens).toBe(950)
  })
})

describe("sampling", () => {
  const traces = syntheticTraces(5000)
  const policy: TailPolicy = {
    errors: true,
    slowerThanMs: 4000,
    overBudget: 8000,
    groundednessBelow: 0.5,
    baseline: 0.05,
  }

  it("head sampling matches the ratio and is deterministic per trace id", () => {
    const kept = traces.filter((t) => headSampled(t.traceId, 0.1)).length
    expect(kept / traces.length).toBeGreaterThan(0.08)
    expect(kept / traces.length).toBeLessThan(0.12)
    expect(headSampled(traces[0].traceId, 0.1)).toBe(headSampled(traces[0].traceId, 0.1))
  })

  it("tail sampling keeps every interesting trace", () => {
    const interesting = traces.filter((t) => isInteresting(t, policy))
    expect(interesting.length).toBeGreaterThan(150)
    expect(interesting.every((t) => tailSampled(t, policy))).toBe(true)
    const kept = traces.filter((t) => tailSampled(t, policy)).length
    expect(kept / traces.length).toBeLessThan(0.15)
  })
})
