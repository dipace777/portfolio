import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { runPipeline, scenarios } from "@/lib/traces/pipeline"

const Body = z.object({ scenario: z.enum(scenarios) })

export const Route = createFileRoute("/api/trace")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = Body.safeParse(await request.json().catch(() => null))
        if (!body.success) return new Response("Bad scenario", { status: 400 })
        return Response.json(await runPipeline(body.data.scenario))
      },
    },
  },
})
