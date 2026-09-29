import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base"
import { OpenTelemetry } from "@ai-sdk/otel"
import { registerTelemetry } from "ai"

context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())

const provider = new BasicTracerProvider({
  resource: resourceFromAttributes({
    "service.name": "support-bot",
    "service.version": process.env.GIT_SHA ?? "dev",
    "deployment.environment.name": process.env.NODE_ENV ?? "development",
  }),
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
    ),
  ],
})

trace.setGlobalTracerProvider(provider)

registerTelemetry(new OpenTelemetry())
