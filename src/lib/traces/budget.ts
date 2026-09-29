export type Chunk = { id: string; tokens: number; score: number }

export const estimateTokens = (text: string) => Math.ceil(text.length / 4)

export const fitToBudget = (
  chunks: ReadonlyArray<Chunk>,
  { budget, reserved }: { budget: number; reserved: number }
) => {
  const kept: Array<Chunk> = []
  let used = reserved
  for (const c of [...chunks].sort((a, b) => b.score - a.score)) {
    if (used + c.tokens > budget) continue
    kept.push(c)
    used += c.tokens
  }
  return { kept, dropped: chunks.length - kept.length, tokens: used }
}

export const price = { input: 3 / 1e6, output: 15 / 1e6 }

export const costUsd = (input: number, output: number) =>
  input * price.input + output * price.output
