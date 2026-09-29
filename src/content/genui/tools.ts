import { tool } from "ai"
import type { InferUITools, UIDataTypes, UIMessage } from "ai"
import { z } from "zod"

type Shipment = { trackingId: string; eta: string; progress: number }
type Triage = { stage: "scanning" | "correlating" | "done"; events: number }

declare const shipments: { get: (id: string) => Promise<Shipment> }
declare const siem: { scan: (alertId: string) => AsyncIterable<Triage> }

export const trackShipment = tool({
  description: "Look up the live status of a shipment by tracking id.",
  inputSchema: z.object({ trackingId: z.string() }),
  execute: ({ trackingId }) => shipments.get(trackingId),
})

export const triageIncident = tool({
  description: "Triage a security alert by scanning and correlating events.",
  inputSchema: z.object({ alertId: z.string(), window: z.string() }),
  async *execute({ alertId }) {
    for await (const progress of siem.scan(alertId)) yield progress
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
  execute: ({ points, threshold }) => ({
    breaches: points.filter((p) => p.v > threshold).length,
  }),
})

export const tools = { trackShipment, triageIncident, plotMetric }

export type ChatMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<typeof tools>
>
