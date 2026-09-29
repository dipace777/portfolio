import type { ChildSpec } from "@/lib/supervise/supervisor"

type Job = { id: string; prompt: string }
type Checkpoint = { jobId: string; step: number; context: Array<string> }

declare const queue: { next: (signal: AbortSignal) => Promise<Job> }
declare const checkpoints: {
  load: (agent: string) => Promise<Checkpoint | null>
  save: (agent: string, c: Checkpoint) => Promise<void>
}
declare const step: (
  c: Checkpoint,
  signal: AbortSignal
) => Promise<Checkpoint | "done">

export const researcher: ChildSpec = {
  id: "researcher",
  restart: "permanent",
  start: async (signal) => {
    let current = await checkpoints.load("researcher")

    while (!signal.aborted) {
      current ??= { jobId: (await queue.next(signal)).id, step: 0, context: [] }
      const next = await step(current, signal)
      if (next === "done") {
        current = null
        continue
      }
      await checkpoints.save("researcher", next)
      current = next
    }
  },
}
