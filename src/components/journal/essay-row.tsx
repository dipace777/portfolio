import { motion } from "motion/react"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"
import { formatDate } from "@/lib/site"
import type { essays } from "@/lib/site"

type Essay = (typeof essays)[number]

function RowBody({ essay }: { essay: Essay }) {
  const live = Boolean(essay.to)
  return (
    <>
      <div className="absolute inset-0 origin-bottom scale-y-0 bg-gradient-to-r from-ember/[0.08] to-transparent transition-transform duration-500 ease-out group-hover:scale-y-100" />
      <div className="relative grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 py-8 md:grid-cols-[6rem_1fr_14rem_auto] md:gap-8 md:py-10">
        <span className="font-mono text-xs text-bone/35">{essay.no}</span>
        <div>
          <h3 className="font-display text-2xl leading-tight text-bone transition-transform duration-500 group-hover:translate-x-2 md:text-4xl">
            {essay.title}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone/45 md:text-base">
            {essay.kicker}
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          {essay.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-bone/15 px-3 py-1 font-mono text-[10px] tracking-wider text-bone/60 uppercase"
            >
              {t}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase">
          <span className="hidden sm:inline">
            {live && essay.published ? (
              <>
                <span className="hidden lg:inline">
                  {formatDate(essay.published)} ·{" "}
                </span>
                {essay.minutes} min
              </>
            ) : (
              "In the edit"
            )}
          </span>
          <ArrowUpRight
            className={`size-5 transition-all duration-500 group-hover:rotate-45 ${
              live ? "text-ember" : "text-bone/40"
            }`}
          />
        </span>
      </div>
    </>
  )
}

export function EssayRow({ essay, index }: { essay: Essay; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{
        duration: 0.9,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative border-b border-bone/10"
    >
      {essay.to ? (
        <Link to={essay.to} className="block">
          <RowBody essay={essay} />
        </Link>
      ) : (
        <div className="cursor-default opacity-70">
          <RowBody essay={essay} />
        </div>
      )}
    </motion.li>
  )
}
