import { useCallback, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Atmosphere, ScrollProgress } from "@/components/landing/atmosphere"
import { Credits } from "@/components/landing/credits"
import { Hero } from "@/components/landing/hero"
import { Intro } from "@/components/landing/intro"
import { Journal } from "@/components/landing/journal"
import { Manifesto } from "@/components/landing/manifesto"
import { Nav } from "@/components/landing/nav"
import { Principles } from "@/components/landing/principles"
import { Reel } from "@/components/landing/reel"
import { Stack } from "@/components/landing/stack"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const [ready, setReady] = useState(false)
  const onIntroDone = useCallback(() => setReady(true), [])

  return (
    <div className="relative bg-ink text-bone antialiased">
      <Intro onDone={onIntroDone} />
      <Atmosphere />
      <ScrollProgress />
      <Nav ready={ready} />
      <main>
        <Hero ready={ready} />
        <Manifesto />
        <Principles />
        <Reel />
        <Stack />
        <Journal />
      </main>
      <Credits />
    </div>
  )
}
