import { createFileRoute } from "@tanstack/react-router"
import { handleChat } from "@/lib/genui/chat"

export const Route = createFileRoute("/api/genui")({
  server: {
    handlers: {
      POST: ({ request }) => handleChat(request),
    },
  },
})
