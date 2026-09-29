import type { LanguageModelV4 } from "@ai-sdk/provider"
import { generateText, isStepCount, tool } from "ai"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { Tripwire, tripwires } from "@/content/supervise/tripwires"

const stuck: LanguageModelV4 = {
  specificationVersion: "v4",
  provider: "test",
  modelId: "stuck",
  supportedUrls: {},
  doGenerate: () =>
    Promise.resolve({
      content: [
        {
          type: "tool-call",
          toolCallId: `call_${Math.random().toString(36).slice(2)}`,
          toolName: "compare",
          input: JSON.stringify({ city: "Pokhara" }),
        },
      ],
      finishReason: { unified: "tool-calls", raw: "tool_use" },
      usage: {
        inputTokens: {
          total: 900,
          noCache: 900,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 40, text: 40, reasoning: undefined },
      },
      warnings: [],
    }),
  doStream: () => {
    throw new Error("unused")
  },
}

describe("tripwires in prepareStep", () => {
  it("turns a silent tool loop into a crash", async () => {
    let executions = 0
    const run = generateText({
      model: stuck,
      prompt: "Plan a trip",
      tools: {
        compare: tool({
          inputSchema: z.object({ city: z.string() }),
          execute: () => {
            executions++
            return "<html>502 Bad Gateway</html>"
          },
        }),
      },
      stopWhen: isStepCount(50),
      prepareStep: tripwires({ maxRepeats: 3 }),
    })
    await expect(run).rejects.toBeInstanceOf(Tripwire)
    await expect(run).rejects.toThrow("loop: compare")
    expect(executions).toBe(3)
  })
})
