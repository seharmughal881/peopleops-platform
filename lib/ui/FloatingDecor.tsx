'use client'

import { motion } from 'motion/react'

type Shape = {
  kind: 'bubble' | 'ring' | 'dot'
  size: number
  top: string
  left: string
  duration: number
  delay: number
  drift: number
  rotate?: number
  opacity?: number
}

const SHAPES: Shape[] = [
  { kind: 'bubble', size: 48, top: '10%', left: '8%',  duration: 10, delay: 0,   drift: 16, rotate: 8 },
  { kind: 'ring',   size: 72, top: '22%', left: '82%', duration: 12, delay: 1.4, drift: 20, rotate: -8 },
  { kind: 'bubble', size: 38, top: '70%', left: '6%',  duration: 13, delay: 0.6, drift: 18, rotate: -6 },
  { kind: 'dot',    size: 10, top: '38%', left: '28%', duration: 7,  delay: 0.4, drift: 12, opacity: 0.7 },
  { kind: 'ring',   size: 36, top: '78%', left: '70%', duration: 11, delay: 1.0, drift: 16, rotate: 10 },
  { kind: 'dot',    size: 8,  top: '14%', left: '48%', duration: 8,  delay: 1.8, drift: 14, opacity: 0.65 },
  { kind: 'ring',   size: 52, top: '50%', left: '90%', duration: 13, delay: 0.2, drift: 18, rotate: -12 },
  { kind: 'bubble', size: 26, top: '54%', left: '52%', duration: 9,  delay: 1.2, drift: 14, rotate: 14 },
  { kind: 'dot',    size: 12, top: '90%', left: '38%', duration: 10, delay: 0.8, drift: 16, opacity: 0.7 },
  { kind: 'bubble', size: 32, top: '32%', left: '16%', duration: 11, delay: 1.6, drift: 18, rotate: -10 },
  { kind: 'ring',   size: 44, top: '64%', left: '32%', duration: 12, delay: 0.9, drift: 16, rotate: 12 },
  { kind: 'dot',    size: 9,  top: '6%',  left: '68%', duration: 8,  delay: 0.3, drift: 12, opacity: 0.6 },
  { kind: 'bubble', size: 22, top: '46%', left: '74%', duration: 10, delay: 2.0, drift: 14, rotate: -14 },
  { kind: 'ring',   size: 28, top: '86%', left: '18%', duration: 11, delay: 1.5, drift: 16, rotate: 8 },
  { kind: 'dot',    size: 11, top: '24%', left: '60%', duration: 9,  delay: 0.5, drift: 14, opacity: 0.65 },
]

export function FloatingDecor({ count = 15 }: { count?: number }) {
  const shapes = SHAPES.slice(0, Math.min(count, SHAPES.length))
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-0 overflow-hidden"
    >
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: s.opacity ?? 0.6,
          }}
          initial={{ y: 0, x: 0, rotate: 0 }}
          animate={{
            y: [0, -s.drift, 0, s.drift * 0.6, 0],
            x: [0, s.drift * 0.4, 0, -s.drift * 0.3, 0],
            rotate: s.rotate ? [0, s.rotate, 0, -s.rotate * 0.5, 0] : 0,
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Shape kind={s.kind} size={s.size} pulseDelay={s.delay * 0.7 + i * 0.18} />
        </motion.div>
      ))}
    </div>
  )
}

function Shape({ kind, size, pulseDelay = 0 }: { kind: Shape['kind']; size: number; pulseDelay?: number }) {
  if (kind === 'bubble') {
    return (
      <div
        className="brand-mark"
        style={{ width: size, height: size, borderRadius: size * 0.32 }}
      />
    )
  }
  if (kind === 'ring') {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <Pulse size={size} delay={pulseDelay} />
        <Pulse size={size} delay={pulseDelay + 1.4} />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `${Math.max(2, size * 0.04)}px solid color-mix(in oklch, var(--accent) 55%, transparent)`,
            boxShadow: '0 0 24px -4px var(--accent-glow)',
          }}
        />
      </div>
    )
  }
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Pulse size={size} delay={pulseDelay} dot />
      <Pulse size={size} delay={pulseDelay + 1.1} dot />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'var(--accent)',
          boxShadow: '0 0 18px 4px var(--accent-glow)',
        }}
      />
    </div>
  )
}

function Pulse({ size, delay, dot = false }: { size: number; delay: number; dot?: boolean }) {
  const targetScale = dot ? 5 : 2.6
  return (
    <motion.span
      className="absolute inset-0 rounded-full"
      style={{
        border: `${Math.max(1, size * 0.05)}px solid var(--accent)`,
        boxShadow: '0 0 12px 0 var(--accent-glow)',
      }}
      initial={{ scale: 1, opacity: 0 }}
      animate={{ scale: [1, targetScale], opacity: [0.7, 0] }}
      transition={{
        duration: 2.8,
        delay,
        repeat: Infinity,
        repeatDelay: 0.6,
        ease: 'easeOut',
      }}
    />
  )
}
