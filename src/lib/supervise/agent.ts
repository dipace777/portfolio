export class Tripwire extends Error {}

export type AgentState = { step: number; context: Array<string> }

export type AgentStep = {
  incarnation: number
  step: number
  call: string
  tokens: number
  poisoned: boolean
}

export type AgentOptions = {
  plan: ReadonlyArray<string>
  checkpoints: Map<string, AgentState> | null
  tripwires: boolean
  environment: { poisonAt: number; poisoned: boolean }
  maxSteps: number
  delayMs: number
  onStep: (step: AgentStep) => void
  onDone: () => void
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), ms)
    signal.addEventListener("abort", () => {
      clearTimeout(t)
      resolve(true)
    })
  })

export const tokensFor = (context: ReadonlyArray<string>) =>
  600 + context.length * 250

let incarnations = 0

export const travelAgent =
  (opts: AgentOptions) => async (signal: AbortSignal) => {
    const incarnation = ++incarnations
    const saved = opts.checkpoints?.get("travel")
    const state: AgentState = saved
      ? { step: saved.step, context: [...saved.context] }
      : { step: 0, context: [] }
    let poisoned = false
    let taken = 0

    while (!signal.aborted && state.step < opts.plan.length) {
      if (++taken > opts.maxSteps)
        throw new Error(`step budget of ${opts.maxSteps} exhausted`)

      const call = poisoned
        ? opts.plan[opts.environment.poisonAt]
        : opts.plan[state.step]
      if (await sleep(opts.delayMs, signal)) return

      const tokens = tokensFor(state.context)
      state.context.push(call)
      opts.onStep({ incarnation, step: state.step, call, tokens, poisoned })

      if (opts.tripwires) {
        const recent = state.context.slice(-3)
        if (recent.length === 3 && recent.every((c) => c === call)) {
          throw new Tripwire(`loop: ${call} ×3`)
        }
      }

      if (
        state.step === opts.environment.poisonAt &&
        !opts.environment.poisoned
      ) {
        opts.environment.poisoned = true
        poisoned = true
      }
      if (poisoned) continue

      state.step++
      opts.checkpoints?.set("travel", {
        step: state.step,
        context: [...state.context],
      })
    }
    if (!signal.aborted) opts.onDone()
  }
