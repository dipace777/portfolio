export class Tripwire extends Error {}

type Step = {
  toolCalls: ReadonlyArray<{ toolName: string; input: unknown }>
  usage: { totalTokens: number | undefined }
}

export const tripwires =
  ({ maxSteps = 20, maxTokens = 60_000, maxRepeats = 3 } = {}) =>
  ({ steps }: { steps: ReadonlyArray<Step> }) => {
    if (steps.length >= maxSteps) {
      throw new Tripwire(`step budget of ${maxSteps} exhausted`)
    }

    const tokens = steps.reduce((n, s) => n + (s.usage.totalTokens ?? 0), 0)
    if (tokens > maxTokens) {
      throw new Tripwire(`token budget exceeded: ${tokens}`)
    }

    const calls = steps.flatMap((s) =>
      s.toolCalls.map((c) => `${c.toolName}(${JSON.stringify(c.input)})`)
    )
    const recent = calls.slice(-maxRepeats)
    if (recent.length === maxRepeats && new Set(recent).size === 1) {
      throw new Tripwire(`loop: ${recent[0]} ×${maxRepeats}`)
    }
    return undefined
  }
