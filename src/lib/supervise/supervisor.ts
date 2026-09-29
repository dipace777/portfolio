export type Restart = "permanent" | "transient" | "temporary"
export type Strategy = "one_for_one" | "one_for_all" | "rest_for_one"

export type ChildSpec = {
  id: string
  restart?: Restart
  start: (signal: AbortSignal) => Promise<void>
}

export type SupervisorEvent =
  | { type: "started"; id: string; pid: number }
  | { type: "exited"; id: string; pid: number }
  | { type: "crashed"; id: string; pid: number; reason: string }
  | { type: "terminated"; id: string; pid: number }
  | { type: "gave_up"; id: string; restarts: number }

export type SupervisorOptions = {
  id: string
  strategy: Strategy
  maxRestarts?: number
  withinMs?: number
  restart?: Restart
  children: ReadonlyArray<ChildSpec>
  onEvent?: (event: SupervisorEvent) => void
  now?: () => number
}

export class Escalation extends Error {
  constructor(
    readonly supervisor: string,
    readonly restarts: number
  ) {
    super(`${supervisor}: ${restarts} restarts exceeded intensity`)
  }
}

let nextPid = 100

const reasonOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

export const supervisor = ({
  id,
  strategy,
  maxRestarts = 3,
  withinMs = 5000,
  restart = "permanent",
  children,
  onEvent = () => {},
  now = Date.now,
}: SupervisorOptions): ChildSpec => ({
  id,
  restart,
  start: (signal) =>
    new Promise<void>((resolve, reject) => {
      const running = new Map<
        string,
        { controller: AbortController; pid: number }
      >()
      const history: Array<number> = []
      let stopped = false

      const launch = (spec: ChildSpec) => {
        const controller = new AbortController()
        const pid = nextPid++
        running.set(spec.id, { controller, pid })
        onEvent({ type: "started", id: spec.id, pid })
        spec.start(controller.signal).then(
          () => exit(spec, pid, null),
          (e: unknown) => exit(spec, pid, e ?? new Error("crashed"))
        )
      }

      const terminate = (childId: string) => {
        const child = running.get(childId)
        if (!child) return
        running.delete(childId)
        child.controller.abort()
        onEvent({ type: "terminated", id: childId, pid: child.pid })
      }

      const shutdown = () => {
        stopped = true
        for (const spec of [...children].reverse()) terminate(spec.id)
      }

      const exit = (spec: ChildSpec, pid: number, error: unknown) => {
        if (stopped || running.get(spec.id)?.pid !== pid) return
        running.delete(spec.id)
        onEvent(
          error === null
            ? { type: "exited", id: spec.id, pid }
            : { type: "crashed", id: spec.id, pid, reason: reasonOf(error) }
        )

        const policy = spec.restart ?? "permanent"
        if (
          policy === "temporary" ||
          (policy === "transient" && error === null)
        )
          return

        const t = now()
        history.push(t)
        while (history.length && history[0] <= t - withinMs) history.shift()
        if (history.length > maxRestarts) {
          onEvent({ type: "gave_up", id, restarts: history.length })
          shutdown()
          reject(new Escalation(id, history.length))
          return
        }

        const at = children.indexOf(spec)
        const affected =
          strategy === "one_for_one"
            ? [spec]
            : strategy === "one_for_all"
              ? [...children]
              : children.slice(at)

        for (const c of [...affected].reverse()) if (c !== spec) terminate(c.id)
        for (const c of affected) {
          if (c === spec || c.restart !== "temporary") launch(c)
        }
      }

      signal.addEventListener("abort", () => {
        shutdown()
        resolve()
      })
      for (const spec of children) launch(spec)
    }),
})

export const run = (root: ChildSpec) => {
  const controller = new AbortController()
  const done = root.start(controller.signal)
  done.catch(() => {})
  return { stop: () => controller.abort(), done }
}
