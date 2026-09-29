import { createServerFn } from "@tanstack/react-start"
import {
  convertToModelMessages,
  isStepCount,
  streamText,
  validateUIMessages,
} from "ai"
import type { LanguageModel } from "ai"
import { z } from "zod"
import { tools } from "./tools"
import type { ChatMessage } from "./tools"

declare const model: LanguageModel
declare const db: {
  load: (threadId: string) => Promise<unknown>
  save: (threadId: string, messages: Array<ChatMessage>) => Promise<void>
}

export const getThread = createServerFn({ method: "GET" })
  .inputValidator(z.object({ threadId: z.string() }))
  .handler(async ({ data }) => {
    const messages = await validateUIMessages<ChatMessage>({
      messages: await db.load(data.threadId),
      tools,
    })
    return JSON.stringify(messages)
  })

export const readThread = (json: string) =>
  JSON.parse(json) as Array<ChatMessage>

export const chat = async (threadId: string, messages: Array<ChatMessage>) => {
  const result = streamText({
    model,
    tools,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(3),
  })
  return result.toUIMessageStreamResponse<ChatMessage>({
    originalMessages: messages,
    onEnd: ({ messages: finished }) => db.save(threadId, finished),
  })
}
