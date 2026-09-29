export const site = {
  name: "Dipesh Chaulagain",
  role: "AI-Native Fullstack Developer",
  email: "hello@dipeshchaulagain.com",
  socials: [
    { label: "GitHub", href: "https://github.com/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
    { label: "X / Twitter", href: "https://x.com/" },
  ],
}

export const chapters = [
  {
    no: "01",
    title: "CRM",
    logline:
      "Pipelines, permissions and the thousand edge cases of how teams actually sell.",
    tags: ["Multi-tenant", "RBAC", "Workflow engines"],
    hue: "from-[#ff9a3c]/40 via-[#8a3b12]/30",
  },
  {
    no: "02",
    title: "Logistics",
    logline:
      "Real-time tracking, routing and dispatch — where latency is measured in trucks.",
    tags: ["Realtime", "Geospatial", "Event-driven"],
    hue: "from-[#5fd4e0]/35 via-[#12506a]/30",
  },
  {
    no: "03",
    title: "Healthcare",
    logline:
      "Clinical workflows engineered for correctness, privacy and airtight audit trails.",
    tags: ["Compliance", "Audit logs", "Scheduling"],
    hue: "from-[#9be3b4]/30 via-[#1d5a45]/30",
  },
  {
    no: "04",
    title: "Cybersecurity",
    logline:
      "Signals, alerts and dashboards for teams whose job is to be professionally paranoid.",
    tags: ["Threat data", "Alerting", "Dashboards"],
    hue: "from-[#ff5a5a]/30 via-[#5a1620]/30",
  },
  {
    no: "05",
    title: "Social Automation",
    logline:
      "Schedulers, content pipelines and agents that post, reply and learn on their own.",
    tags: ["Queues", "LLM agents", "Cron at scale"],
    hue: "from-[#c89bff]/30 via-[#3d1e6a]/30",
  },
] as const

export const stack = [
  "React",
  "TypeScript",
  "Effect TS",
  "AI SDK",
  "Next.js",
  "TanStack Start",
  "React Native",
  "Node",
  "Bun",
  "Golang",
  "Elixir",
] as const

export const stackGroups = [
  {
    label: "Interface",
    items: ["React", "Next.js", "TanStack Start", "React Native"],
  },
  { label: "Languages", items: ["TypeScript", "Golang", "Elixir"] },
  { label: "Runtime", items: ["Node", "Bun", "BEAM"] },
  { label: "Intelligence", items: ["AI SDK", "Effect TS", "Agents & tools"] },
] as const

export const essays = [
  {
    no: "E.01",
    title: "Durable agents with Effect TS",
    kicker:
      "Retries, timeouts and typed failures for LLM tool calls that never silently die.",
    tags: ["Effect", "Agents"],
  },
  {
    no: "E.02",
    title: "Streaming generative UI on TanStack Start",
    kicker:
      "Server functions, AI SDK streams and components that render while the model thinks.",
    tags: ["AI SDK", "TanStack"],
  },
  {
    no: "E.03",
    title: "Traces, not vibes: observability for LLM pipelines",
    kicker:
      "Spans, token budgets and evals wired into the same telemetry as the rest of your stack.",
    tags: ["OpenTelemetry", "Evals"],
  },
  {
    no: "E.04",
    title: "Let it crash: what Elixir supervisors teach AI agents",
    kicker:
      "Supervision trees as a mental model for fault-tolerant, multi-agent systems.",
    tags: ["Elixir", "Architecture"],
  },
] as const
