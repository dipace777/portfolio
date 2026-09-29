export type Groundedness = {
  score: number
  label: "pass" | "fail"
  cited: number
  sentences: number
}

export const groundedness = (
  answer: string,
  sources: number,
  threshold = 0.7
): Groundedness => {
  const sentences = answer
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const cited = sentences.filter((s) =>
    [...s.matchAll(/\[(\d+)\]/g)].some((m) => {
      const n = Number(m[1])
      return n >= 1 && n <= sources
    })
  ).length
  const score = sentences.length ? cited / sentences.length : 0
  return {
    score: Math.round(score * 100) / 100,
    label: score >= threshold ? "pass" : "fail",
    cited,
    sentences: sentences.length,
  }
}
