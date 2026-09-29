import { motion, useScroll, useSpring } from "motion/react"

export function Atmosphere() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] overflow-hidden opacity-[0.07] mix-blend-overlay"
      >
        <div className="film-grain absolute -inset-[50%]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[59] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.65)_100%)]"
      />
    </>
  )
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] h-px origin-left bg-gradient-to-r from-ember via-ember-soft to-glacier"
    />
  )
}
