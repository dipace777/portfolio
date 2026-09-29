import { motion } from "motion/react"
import { infraStack, stack, stackGroups } from "@/lib/site"

function Marquee({
  names,
  reverse,
  duration,
}: {
  names: ReadonlyArray<string>
  reverse?: boolean
  duration: string
}) {
  const items = [...names, ...names]
  return (
    <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div
        className="animate-marquee flex w-max shrink-0 items-center"
        style={
          {
            "--marquee-duration": duration,
            animationDirection: reverse ? "reverse" : "normal",
          } as React.CSSProperties
        }
      >
        {items.map((name, i) => (
          <span key={i} className="flex items-center">
            <span
              className={`px-8 font-display text-[clamp(3rem,8vw,7.5rem)] leading-none whitespace-nowrap ${
                i % 2 ? "text-stroke italic" : "text-bone"
              }`}
            >
              {name}
            </span>
            <span className="text-2xl text-ember">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function Stack() {
  return (
    <section
      id="stack"
      className="relative overflow-hidden bg-ink py-32 md:py-44"
    >
      <div className="mx-auto mb-16 max-w-[1400px] px-6 md:px-10">
        <div className="mb-6 flex items-center gap-4 font-mono text-[11px] tracking-[0.3em] text-bone/40 uppercase">
          <span className="h-px w-10 bg-bone/30" />
          Scene 05 — The toolkit
        </div>
        <h2 className="max-w-3xl font-display text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.95] tracking-[-0.02em] text-bone">
          Typed end to end.{" "}
          <span className="text-bone/35 italic">From edge to agent.</span>
        </h2>
      </div>

      <div className="space-y-4">
        <Marquee names={stack} duration="55s" />
        <Marquee names={infraStack} duration="45s" reverse />
      </div>

      <div className="mx-6 mt-24 grid max-w-[1400px] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-bone/10 bg-bone/10 md:mx-10 md:grid-cols-3 xl:mx-auto">
        {stackGroups.map((g, i) => (
          <motion.div
            key={g.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: 0.8,
              delay: i * 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group relative bg-ink p-7 transition-colors hover:bg-[#0c0e11] md:p-9"
          >
            <span className="font-mono text-[10px] tracking-[0.3em] text-ember/80 uppercase">
              {String(i + 1).padStart(2, "0")} · {g.label}
            </span>
            <ul className="mt-6 space-y-2.5">
              {g.items.map((item) => (
                <li
                  key={item}
                  className="text-lg text-bone/75 transition-colors group-hover:text-bone"
                >
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
