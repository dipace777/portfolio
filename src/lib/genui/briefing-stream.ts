import { Output, streamText } from "ai"
import { z } from "zod"
import { scriptedModel } from "./scripted-model"

export const BriefingCard = z.object({
  kind: z.enum(["metric", "alert", "note"]),
  title: z.string(),
  value: z.string(),
  delta: z.string(),
  body: z.string(),
})

export type BriefingCard = z.infer<typeof BriefingCard>

export async function* briefingCards() {
  const result = streamText({
    model: scriptedModel,
    prompt: "Write this morning's ops briefing.",
    output: Output.array({ element: BriefingCard }),
  })
  for await (const card of result.elementStream) yield card
}
