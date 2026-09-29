export const site = {
  name: "Dipesh Chaulagain",
  role: "AI-Native Fullstack Developer",
  url: "https://chaulagaindipesh.com.np",
  description:
    "Dipesh Chaulagain builds resilient, observable and scalable agentic systems. Interactive essays on building AI-native software with React, Effect TS, AI SDK and TanStack Start.",
  twitter: "@DipAce77",
  email: "codeict.dipesh@gmail.com",
  socials: [
    { label: "GitHub", href: "https://github.com/dipace777" },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/dipesh-chaulagain-374737202/",
    },
    { label: "X / Twitter", href: "https://x.com/DipAce77" },
  ],
}

export const chapters = [
  {
    no: "01",
    title: "CRM",
    company: "Heubert",
    role: "Software Engineer",
    period: "May 2022 — Jul 2023",
    logline:
      "A CRM SaaS running the full lead-to-conversion lifecycle for education consultancies and visa institutes.",
    metric: { value: "500+", label: "Users across branches" },
    highlights: [
      "Designed RBAC and ABAC models for users spread across multiple branches, supporting flexible, dynamic permission structures.",
      "Built a real-time messaging layer with Redis pub/sub and WebSockets, keeping event delivery consistent across horizontally scaled Kubernetes pods.",
      "Shipped a containerized React + NestJS monorepo (Nx) with Bitbucket CI/CD and zero-downtime Kubernetes deployments.",
    ],
    tags: ["RBAC / ABAC", "Realtime", "Kubernetes"],
    stack: ["React", "NestJS", "Redis", "WebSockets", "Kubernetes", "Nx"],
    hue: "from-[#ff9a3c]/40 via-[#8a3b12]/30",
    accent: "#ff9a3c",
  },
  {
    no: "02",
    title: "Logistics",
    company: "Upaya",
    role: "Software Engineer",
    period: "Jul 2023 — Feb 2024",
    logline:
      "A B2B logistics platform for enterprise fleets, where trip schedules are anything but predictable.",
    metric: { value: "Live", label: "Geo-matched driver bidding" },
    highlights: [
      "Built core features for enterprise-scale vehicle management under highly variable, uncertain trip scheduling.",
      "Prototyped automated trip assignment with NestJS, Redis and MongoDB geospatial queries, matching drivers within a radius through real-time bidding.",
      "Introduced Kysely for code-generated, strongly typed queries, replacing untyped database calls.",
      "Returned as a part-time consultant (Sep — Dec 2025) to mentor junior developers on system design and code quality.",
    ],
    tags: ["Geospatial", "Realtime bidding", "Type-safe SQL"],
    stack: ["NestJS", "MongoDB", "Redis", "Kysely", "TypeScript"],
    hue: "from-[#5fd4e0]/35 via-[#12506a]/30",
    accent: "#5fd4e0",
  },
  {
    no: "03",
    title: "Healthcare",
    company: "Coding Mountain",
    role: "Software Engineer",
    period: "Feb 2024 — Sep 2024",
    logline:
      "Clinical data pipelines where integrity isn't a feature — it's the requirement.",
    metric: { value: "FHIR", label: "Standards-compliant pipelines" },
    highlights: [
      "Planned and executed an incremental ETL migration from Firestore to MySQL with Python pipelines, preserving integrity and relational consistency.",
      "Queried and transformed FHIR-compliant healthcare sources with complex SQL across clinical data pipelines.",
      "Built AI-powered Chrome extensions with Vite, React and Tailwind to capture and analyze user behavior patterns.",
    ],
    tags: ["FHIR", "ETL", "AI extensions"],
    stack: ["Python", "MySQL", "Firestore", "SQL", "React", "Vite"],
    hue: "from-[#9be3b4]/30 via-[#1d5a45]/30",
    accent: "#9be3b4",
  },
  {
    no: "04",
    title: "Cybersecurity",
    company: "Guardsix · formerly Logpoint",
    role: "Software Engineer",
    period: "Jan 2025 — Apr 2026",
    logline:
      "One control plane for configuring and querying SIEM deployments across cloud and on-prem.",
    metric: { value: "50+", label: "Distributed SIEM deployments" },
    highlights: [
      "Built backend services on Zookeeper and Hadoop to coordinate distributed systems and process data reliably over VPN networks.",
      "Designed a plugin-based architecture for log source configuration across Logpoint versions, eliminating per-version custom code.",
      "Architected a Redux-Observable state layer for highly dynamic configuration forms with predictable real-time updates.",
      "Implemented OAuth 2.0 SSO with Okta and Keycloak, and led the backend migration from CommonJS to ES Modules.",
    ],
    tags: ["MSSP", "Distributed systems", "SSO"],
    stack: [
      "Zookeeper",
      "Hadoop",
      "Redux-Observable",
      "OAuth 2.0",
      "Okta",
      "Keycloak",
    ],
    hue: "from-[#ff5a5a]/30 via-[#5a1620]/30",
    accent: "#ff6b6b",
  },
  {
    no: "05",
    title: "Social Automation",
    company: "Sociora",
    role: "Lead Software Engineer",
    period: "Apr 2026 — Present",
    logline:
      "A multi-tenant, AI-native platform for creating, managing and automating social content across every network.",
    metric: { value: "Agentic", label: "Content & inbox workflows" },
    highlights: [
      "Architected and led a multi-tenant platform automating content and engagement across Facebook, Instagram, LinkedIn and X.",
      "Designed the full-stack TypeScript architecture with type-safe APIs, clear service boundaries and scalable third-party integrations.",
      "Designed an AI-native, canvas-based editor that fuses generative AI with interactive design tools in one workspace.",
      "Built agentic workflows with structured execution, retries, provider fallbacks, observability and human-in-the-loop controls.",
    ],
    tags: ["Agentic workflows", "Gen-AI canvas", "Multi-tenant"],
    stack: ["TypeScript", "AI SDK", "Agents", "Canvas", "Multi-tenant"],
    hue: "from-[#c89bff]/30 via-[#3d1e6a]/30",
    accent: "#c89bff",
  },
] as const

export type Chapter = (typeof chapters)[number]

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
  "Python",
  "Elixir",
] as const

export const infraStack = [
  "PostgreSQL",
  "AWS",
  "MongoDB",
  "GCP",
  "Redis",
  "Docker",
  "ArangoDB",
  "Kubernetes",
] as const

export const stackGroups = [
  {
    label: "Interface",
    items: ["React", "Next.js", "TanStack Start", "React Native"],
  },
  { label: "Languages", items: ["TypeScript", "Golang", "Python", "Elixir"] },
  { label: "Runtime", items: ["Node", "Bun", "BEAM"] },
  {
    label: "Data",
    items: ["PostgreSQL", "MongoDB", "ArangoDB", "Redis"],
  },
  { label: "Cloud", items: ["AWS", "GCP", "Docker", "Kubernetes"] },
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
