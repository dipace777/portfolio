import { ROOT_CONTEXT } from "@opentelemetry/api"
import {
  SamplingDecision,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base"

export type TraceSummary = {
  traceId: string
  durationMs: number
  error: boolean
  tokens: number
  groundedness: number
}

export type TailPolicy = {
  errors: boolean
  slowerThanMs: number | null
  overBudget: number | null
  groundednessBelow: number | null
  baseline: number
}

export const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const hex = (rand: () => number, length: number) =>
  Array.from({ length }, () => Math.floor(rand() * 16).toString(16)).join("")

export const syntheticTraces = (n: number, seed = 7): Array<TraceSummary> => {
  const rand = mulberry32(seed)
  return Array.from({ length: n }, () => {
    const r = rand()
    const slow = r < 0.015
    const error = r >= 0.015 && r < 0.025
    const bloated = r >= 0.025 && r < 0.035
    const ungrounded = r >= 0.035 && r < 0.05
    return {
      traceId: hex(rand, 32),
      durationMs: Math.round(
        (slow ? 6200 : 1100) * (0.7 + rand() * 0.6),
      ),
      error,
      tokens: Math.round((bloated ? 14500 : 3500) * (0.85 + rand() * 0.3)),
      groundedness: ungrounded
        ? Math.round(rand() * 45) / 100
        : Math.round((0.78 + rand() * 0.22) * 100) / 100,
    }
  })
}

export const isInteresting = (t: TraceSummary, p: TailPolicy) =>
  (p.errors && t.error) ||
  (p.slowerThanMs !== null && t.durationMs > p.slowerThanMs) ||
  (p.overBudget !== null && t.tokens > p.overBudget) ||
  (p.groundednessBelow !== null && t.groundedness < p.groundednessBelow)

export const headSampled = (traceId: string, ratio: number) =>
  new TraceIdRatioBasedSampler(ratio).shouldSample(ROOT_CONTEXT, traceId)
    .decision === SamplingDecision.RECORD_AND_SAMPLED

export const tailSampled = (t: TraceSummary, p: TailPolicy) =>
  isInteresting(t, p) || headSampled(t.traceId, p.baseline)
