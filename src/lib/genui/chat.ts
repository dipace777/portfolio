import {
  convertToModelMessages,
  isStepCount,
  safeValidateUIMessages,
  streamText,
} from "ai"
import { scriptedModel } from "./scripted-model"
import { tools } from "./tools"
import type { GenUIMessage } from "./tools"

const MAX_BODY = 32_000
const MAX_MESSAGES = 12

export const handleChat = async (request: Request) => {
  const raw = await request.text()
  if (raw.length > MAX_BODY) return new Response("Too large", { status: 413 })

  let body: { messages?: unknown }
  try {
    body = JSON.parse(raw) as { messages?: unknown }
  } catch {
    return new Response("Bad JSON", { status: 400 })
  }
  const parsed = await safeValidateUIMessages<GenUIMessage>({
    messages: body.messages,
    tools,
  })
  if (!parsed.success) return new Response("Bad messages", { status: 400 })

  const result = streamText({
    model: scriptedModel,
    tools,
    messages: await convertToModelMessages(parsed.data.slice(-MAX_MESSAGES)),
    stopWhen: isStepCount(3),
    abortSignal: request.signal,
  })
  return result.toUIMessageStreamResponse()
}
