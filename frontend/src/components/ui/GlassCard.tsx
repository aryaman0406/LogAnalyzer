import { cn } from '@/lib/utils'
import { motion, type HTMLMotionProps } from 'framer-motion'

interface GlassCardProps extends HTMLMotionProps<'div'> {
  glow?: boolean
  hover?: boolean
  children: React.ReactNode
}

export function GlassCard({
  glow = false,
  hover = true,
  children,
  className,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={
        hover
          ? {
              y: -1.5,
              transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
            }
          : undefined
      }
      className={cn(
        'glass-card rounded-xl border transition-all duration-200',
        glow && 'border-accent/40 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.25)]',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
