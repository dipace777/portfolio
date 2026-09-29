import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

const SEEN_KEY = "dc:intro-seen"
const COUNT = [3, 2, 1]
const STEP_MS = 520

export function Intro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(true)
  const skipIntro = useRef<boolean | null>(null)

  useEffect(() => {
    if (skipIntro.current === null) {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      skipIntro.current = reduced || sessionStorage.getItem(SEEN_KEY) !== null
      sessionStorage.setItem(SEEN_KEY, "1")
    }
    if (skipIntro.current) {
      setOpen(false)
      onDone()
      return
    }
    const timers = COUNT.map((_, i) =>
      window.setTimeout(() => setStep(i + 1), STEP_MS * (i + 1))
    )
    const end = window.setTimeout(
      () => setOpen(false),
      STEP_MS * (COUNT.length + 1)
    )
    return () => [...timers, end].forEach(clearTimeout)
  }, [onDone])

  const skip = () => setOpen(false)

  return (
    <AnimatePresence onExitComplete={onDone}>
      {open && (
        <motion.div
          key="intro"
          onClick={skip}
          className="intro-failsafe fixed inset-0 z-[100] cursor-pointer"
          exit={{ transition: { duration: 1 } }}
        >
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 bg-ink"
            exit={{
              y: "-100%",
              transition: { duration: 1, ease: [0.76, 0, 0.24, 1] },
            }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 h-1/2 bg-ink"
            exit={{
              y: "100%",
              transition: { duration: 1, ease: [0.76, 0, 0.24, 1] },
            }}
          />

          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.35 } }}
          >
            <div className="relative flex size-56 items-center justify-center sm:size-72">
              <div className="absolute inset-0 rounded-full border border-bone/15" />
              <div className="absolute inset-6 rounded-full border border-bone/10" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-bone/10" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-bone/10" />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(255,154,60,0.22), transparent 30%)",
                }}
                animate={{ rotate: 360 * COUNT.length }}
                transition={{
                  duration: (STEP_MS * COUNT.length) / 1000,
                  ease: "linear",
                }}
              />
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={step}
                  initial={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.15, filter: "blur(8px)" }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-8xl text-bone sm:text-9xl"
                >
                  {step < COUNT.length ? COUNT[step] : "✦"}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.p
            className="absolute inset-x-0 bottom-10 text-center font-mono text-[10px] tracking-[0.4em] text-bone/40 uppercase"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            A Dipesh Chaulagain production · click to skip
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
