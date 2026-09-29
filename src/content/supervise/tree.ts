import { run, supervisor } from "@/lib/supervise/supervisor"
import type { ChildSpec } from "@/lib/supervise/supervisor"

declare const sessionStore: ChildSpec
declare const planner: ChildSpec
declare const researcher: ChildSpec
declare const writer: ChildSpec
declare const search: ChildSpec
declare const browser: ChildSpec
declare const sandbox: ChildSpec
declare const page: (e: unknown) => void

const app = run(
  supervisor({
    id: "app",
    strategy: "one_for_one",
    maxRestarts: 3,
    withinMs: 5000,
    children: [
      sessionStore,
      supervisor({
        id: "research",
        strategy: "one_for_all",
        children: [planner, researcher, writer],
      }),
      supervisor({
        id: "tools",
        strategy: "one_for_one",
        children: [search, browser, { ...sandbox, restart: "transient" }],
      }),
    ],
  })
)

app.done.catch(page)
