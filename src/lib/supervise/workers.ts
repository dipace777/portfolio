import type { ChildSpec, Restart } from "./supervisor"

export const createWorkers = () => {
  const crashers = new Map<string, (reason: Error) => void>()
  const quitters = new Map<string, () => void>()

  const worker = (
    id: string,
    {
      restart,
      bootFailure,
    }: { restart?: Restart; bootFailure?: () => string | null } = {}
  ): ChildSpec => ({
    id,
    restart,
    start: (signal) =>
      new Promise<void>((resolve, reject) => {
        const failure = bootFailure?.()
        if (failure) {
          setTimeout(() => reject(new Error(failure)), 120)
          return
        }
        crashers.set(id, reject)
        quitters.set(id, resolve)
        signal.addEventListener("abort", () => resolve())
      }),
  })

  return {
    worker,
    crash: (id: string, reason = "boom") =>
      crashers.get(id)?.(new Error(reason)),
    quit: (id: string) => quitters.get(id)?.(),
  }
}
