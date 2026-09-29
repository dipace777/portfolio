import { context } from "@opentelemetry/api"
import type { HrTime } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base"
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OpenTelemetry } from "@ai-sdk/otel"

export type WireSpan = {
  id: string
  parent: string | null
  name: string
  kind: number
  start: number
  duration: number
  status: { code: number; message?: string }
  attributes: Record<string, unknown>
  events: Array<{ name: string; at: number; attributes: Record<string, unknown> }>
}

export type WireTrace = { traceId: string; spans: Array<WireSpan> }

const ms = ([s, ns]: HrTime) => s * 1e3 + ns / 1e6

class TraceCollector implements SpanProcessor {
  private readonly traces = new Map<string, Array<ReadableSpan>>()

  onStart() {}
  onEnd(span: ReadableSpan) {
    const id = span.spanContext().traceId
    const spans = this.traces.get(id)
    if (spans) spans.push(span)
  }
  watch(traceId: string) {
    this.traces.set(traceId, [])
  }
  take(traceId: string): WireTrace {
    const spans = this.traces.get(traceId) ?? []
    this.traces.delete(traceId)
    const t0 = Math.min(...spans.map((s) => ms(s.startTime)))
    return {
      traceId,
      spans: spans
        .map((s) => ({
          id: s.spanContext().spanId,
          parent: s.parentSpanContext?.spanId ?? null,
          name: s.name,
          kind: s.kind,
          start: ms(s.startTime) - t0,
          duration: ms(s.duration),
          status: { code: s.status.code, message: s.status.message },
          attributes: { ...s.attributes },
          events: s.events.map((e) => {
            const { "exception.stacktrace": _, ...attributes } = e.attributes ?? {}
            return { name: e.name, at: ms(e.time) - t0, attributes }
          }),
        }))
        .sort((a, b) => a.start - b.start),
    }
  }
  forceFlush() {
    return Promise.resolve()
  }
  shutdown() {
    return Promise.resolve()
  }
}

context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())

export const collector = new TraceCollector()

const provider = new BasicTracerProvider({ spanProcessors: [collector] })

export const tracer = provider.getTracer("portfolio.support-bot", "1.0.0")

export const aiTelemetry = new OpenTelemetry({ tracer })
