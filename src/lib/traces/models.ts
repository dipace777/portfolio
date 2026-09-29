import type { EmbeddingModelV4, LanguageModelV4 } from "@ai-sdk/provider"

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(t)
      reject(signal.reason)
    })
  })

export type ModelScript = {
  latencyMs: number
  inputTokens: number
  outputTokens: number
  answer: string
  callTool?: { name: string; input: Record<string, unknown> }
}

const usage = (input: number, output: number) => ({
  inputTokens: {
    total: input,
    noCache: input,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: output, text: output, reasoning: undefined },
})

export const scriptedChat = (script: ModelScript): LanguageModelV4 => ({
  specificationVersion: "v4",
  provider: "anthropic.messages",
  modelId: "claude-sonnet-4-5",
  supportedUrls: {},
  doGenerate: async ({ prompt, abortSignal }) => {
    const last = prompt.at(-1)
    const firstStep = last?.role !== "tool"
    await sleep(
      firstStep ? script.latencyMs : script.latencyMs * 0.6,
      abortSignal
    )
    if (firstStep && script.callTool) {
      return {
        content: [
          {
            type: "tool-call",
            toolCallId: `toolu_${Math.random().toString(36).slice(2, 10)}`,
            toolName: script.callTool.name,
            input: JSON.stringify(script.callTool.input),
          },
        ],
        finishReason: { unified: "tool-calls", raw: "tool_use" },
        usage: usage(script.inputTokens, 48),
        warnings: [],
      }
    }
    return {
      content: [{ type: "text", text: script.answer }],
      finishReason: { unified: "stop", raw: "end_turn" },
      usage: usage(
        firstStep ? script.inputTokens : script.inputTokens + 180,
        script.outputTokens
      ),
      warnings: [],
    }
  },
  doStream: () => {
    throw new Error("scriptedChat only supports generateText")
  },
})

export const scriptedEmbedder: EmbeddingModelV4 = {
  specificationVersion: "v4",
  provider: "openai.embedding",
  modelId: "text-embedding-3-small",
  maxEmbeddingsPerCall: 2048,
  supportsParallelCalls: true,
  doEmbed: async ({ values, abortSignal }) => {
    await sleep(70, abortSignal)
    return {
      embeddings: values.map((v) =>
        Array.from({ length: 8 }, (_, i) => Math.sin(v.length * (i + 1)))
      ),
      usage: {
        tokens: values.reduce((n, v) => n + Math.ceil(v.length / 4), 0),
      },
      warnings: [],
    }
  },
}
