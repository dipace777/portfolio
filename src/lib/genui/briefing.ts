import { createServerFn } from "@tanstack/react-start"
import { briefingCards } from "./briefing-stream"

export const streamBriefing = createServerFn({ method: "GET" }).handler(
  async function* () {
    yield* briefingCards()
  },
)
