import { describe, expect, it } from "vitest"
import { handleChat } from "./chat"
import { briefingCards } from "./briefing-stream"

const ask = async (text: string) => {
  const res = await handleChat(
    new Request("http://localhost/api/genui", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text }] }],
      }),
    }),
  )
  const body = await res.text()
  const chunks = body
    .split("\n")
    .filter((l) => l.startsWith("data: ") && l !== "data: [DONE]")
    .map((l) => JSON.parse(l.slice(6)) as Record<string, unknown>)
  return { res, chunks, types: chunks.map((c) => c.type as string) }
}

describe("generative UI endpoint", () => {
  it("streams a tool call with incremental input, then its output", async () => {
    const { res, types, chunks } = await ask("track NP-4471")
    expect(res.headers.get("content-type")).toContain("text/event-stream")
    expect(types).toContain("tool-input-start")
    expect(types.filter((t) => t === "tool-input-delta").length).toBeGreaterThan(3)
    const output = chunks.find((c) => c.type === "tool-output-available")
    expect(output?.output).toMatchObject({ trackingId: "NP-4471" })
    expect(types.filter((t) => t === "start-step").length).toBe(2)
  })

  it("streams preliminary outputs from a generator tool", async () => {
    const { chunks } = await ask("triage the failed logins alert")
    const outputs = chunks.filter((c) => c.type === "tool-output-available")
    expect(outputs.length).toBeGreaterThan(3)
    expect(outputs.slice(0, -1).every((o) => o.preliminary === true)).toBe(true)
    expect(outputs.at(-1)?.output).toMatchObject({ stage: "done" })
  }, 15_000)

  it("streams complete structured elements one at a time", async () => {
    const seen: Array<{ title: string; at: number }> = []
    const start = Date.now()
    for await (const card of briefingCards()) {
      seen.push({ title: card.title, at: Date.now() - start })
    }
    expect(seen.map((s) => s.title)).toEqual([
      "Agent runs · 24h",
      "Token spend",
      "p95 first token",
      "Suggested next step",
    ])
    expect(seen[3].at - seen[0].at).toBeGreaterThan(500)
  }, 15_000)

  it("rejects malformed messages", async () => {
    const res = await handleChat(
      new Request("http://localhost/api/genui", {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "robot" }] }),
      }),
    )
    expect(res.status).toBe(400)
  })
})
