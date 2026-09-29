import { tool } from "ai"
import type { InferUITools, UIDataTypes, UIMessage } from "ai"
import { z } from "zod"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const trackShipment = tool({
  description: "Look up the live status of a shipment by tracking id.",
  inputSchema: z.object({
    trackingId: z.string().describe("Tracking id, e.g. NP-4471"),
  }),
  execute: async ({ trackingId }) => {
    await sleep(900)
    return {
      trackingId,
      status: "in-transit" as const,
      origin: "Kathmandu",
      destination: "New Delhi",
      eta: "Oct 2 · 14:00",
      carrier: "Upaya Freight",
      progress: 0.62,
      checkpoints: [
        { place: "Kathmandu hub", time: "Sep 29 · 08:12", done: true },
        { place: "Birgunj customs", time: "Sep 30 · 11:40", done: true },
        { place: "Raxaul border", time: "Sep 30 · 16:05", done: true },
        { place: "Lucknow depot", time: "Oct 1 · 19:00", done: false },
        { place: "New Delhi", time: "Oct 2 · 14:00", done: false },
      ],
    }
  },
})

type Finding = { rule: string; hits: number; severity: "low" | "high" }

export const triageIncident = tool({
  description:
    "Triage a security alert by scanning SIEM events and correlating findings.",
  inputSchema: z.object({
    alertId: z.string(),
    window: z.string().describe("Lookback window, e.g. 24h"),
  }),
  async *execute({ alertId }) {
    const findings: Array<Finding> = []
    const snapshot = (
      stage: "scanning" | "correlating" | "done",
      events: number,
    ) => ({
      alertId,
      stage,
      events,
      findings: [...findings],
      verdict: null as string | null,
    })

    for (const events of [180_000, 740_000, 1_320_000, 2_100_000]) {
      await sleep(450)
      yield snapshot("scanning", events)
    }
    const rules: Array<Finding> = [
      { rule: "847 failed logins from 3 ASNs", hits: 847, severity: "high" },
      { rule: "Same password tried on 212 users", hits: 212, severity: "high" },
      { rule: "Login from new country", hits: 9, severity: "low" },
    ]
    for (const finding of rules) {
      await sleep(600)
      findings.push(finding)
      yield snapshot("correlating", 2_100_000)
    }
    await sleep(500)
    yield {
      ...snapshot("done", 2_100_000),
      verdict: "Credential stuffing. Block the 3 ASNs and force resets.",
    }
  },
})

export const plotMetric = tool({
  description: "Render a time series chart for a metric.",
  inputSchema: z.object({
    title: z.string(),
    unit: z.string(),
    threshold: z.number(),
    points: z.array(z.object({ t: z.string(), v: z.number() })),
  }),
  execute: async ({ points, threshold }) => ({
    breaches: points.filter((p) => p.v > threshold).length,
    peak: Math.max(...points.map((p) => p.v)),
  }),
})

export const tools = { trackShipment, triageIncident, plotMetric }

export type GenUIMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<typeof tools>
>
