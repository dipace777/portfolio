import { useEffect, useRef } from "react"

type GraphNode = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  glow: number
  warm: boolean
}

type Pulse = {
  from: number
  to: number
  t: number
  speed: number
  hops: number
}

const LINK_DISTANCE = 160
const MAX_PULSES = 36

export function AgentGraph({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    const mouse = { x: -9999, y: -9999 }
    let width = 0
    let height = 0
    let nodes: GraphNode[] = []
    let pulses: Pulse[] = []
    let raf = 0
    let visible = true
    let lastSpawn = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio, 2)
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(120, (width * height) / 12000))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.5,
        glow: 0,
        warm: Math.random() < 0.35,
      }))
      pulses = []
    }

    const neighbors = (i: number) => {
      const a = nodes[i]
      const out: number[] = []
      for (let j = 0; j < nodes.length; j++) {
        if (j === i) continue
        const b = nodes[j]
        if (Math.hypot(a.x - b.x, a.y - b.y) < LINK_DISTANCE) out.push(j)
      }
      return out
    }

    const spawn = (from: number, hops: number) => {
      if (pulses.length >= MAX_PULSES) return
      const n = neighbors(from)
      if (!n.length) return
      pulses.push({
        from,
        to: n[Math.floor(Math.random() * n.length)],
        t: 0,
        speed: 0.012 + Math.random() * 0.018,
        hops,
      })
    }

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height)

      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx
          n.y += n.vy
          if (n.x < -20) n.x = width + 20
          if (n.x > width + 20) n.x = -20
          if (n.y < -20) n.y = height + 20
          if (n.y > height + 20) n.y = -20
        }
        n.glow *= 0.965
      }

      ctx.lineWidth = 0.6
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d > LINK_DISTANCE) continue
          const md = Math.hypot(
            (a.x + b.x) / 2 - mouse.x,
            (a.y + b.y) / 2 - mouse.y
          )
          const boost = md < 180 ? (1 - md / 180) * 0.35 : 0
          const alpha = (1 - d / LINK_DISTANCE) * 0.16 + boost
          ctx.strokeStyle = `rgba(95, 212, 224, ${alpha})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      if (!reduced && now - lastSpawn > 220) {
        lastSpawn = now
        spawn(Math.floor(Math.random() * nodes.length), 0)
      }

      ctx.globalCompositeOperation = "lighter"
      pulses = pulses.filter((p) => {
        p.t += p.speed
        const a = nodes[p.from]
        const b = nodes[p.to]
        const t = Math.min(p.t, 1)
        const x = a.x + (b.x - a.x) * t
        const y = a.y + (b.y - a.y) * t
        const tail = Math.max(0, t - 0.25)
        const grad = ctx.createLinearGradient(
          a.x + (b.x - a.x) * tail,
          a.y + (b.y - a.y) * tail,
          x,
          y
        )
        grad.addColorStop(0, "rgba(255,154,60,0)")
        grad.addColorStop(1, "rgba(255,170,90,0.9)")
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(a.x + (b.x - a.x) * tail, a.y + (b.y - a.y) * tail)
        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.fillStyle = "rgba(255, 200, 140, 0.95)"
        ctx.beginPath()
        ctx.arc(x, y, 1.6, 0, Math.PI * 2)
        ctx.fill()

        if (p.t >= 1) {
          b.glow = 1
          if (p.hops < 5 && Math.random() < 0.72) spawn(p.to, p.hops + 1)
          return false
        }
        return true
      })

      for (const n of nodes) {
        const md = Math.hypot(n.x - mouse.x, n.y - mouse.y)
        const hover = md < 140 ? 1 - md / 140 : 0
        const g = Math.max(n.glow, hover * 0.6)
        if (g > 0.02) {
          const radius = 14 * g + 4
          const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius)
          halo.addColorStop(0, `rgba(255,154,60,${0.55 * g})`)
          halo.addColorStop(1, "rgba(255,154,60,0)")
          ctx.fillStyle = halo
          ctx.beginPath()
          ctx.arc(n.x, n.y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = n.warm
          ? `rgba(255, 190, 120, ${0.55 + g * 0.45})`
          : `rgba(160, 230, 238, ${0.45 + g * 0.5})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + g * 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = "source-over"
    }

    const loop = (now: number) => {
      if (visible) draw(now)
      raf = requestAnimationFrame(loop)
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    io.observe(canvas)

    resize()
    if (reduced) draw(0)
    else raf = requestAnimationFrame(loop)

    window.addEventListener("resize", resize)
    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className={className} />
}
