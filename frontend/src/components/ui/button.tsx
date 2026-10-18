import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-bg-base font-semibold shadow hover:bg-accent-hover hover:shadow-glow',
        secondary:
          'bg-surface text-text-primary border border-border hover:bg-surface-hover hover:border-border-hover',
        outline:
          'border border-border bg-transparent text-text-primary hover:bg-surface hover:text-text-primary',
        ghost:
          'text-text-secondary hover:bg-surface hover:text-text-primary',
        danger:
          'bg-error/20 text-error border border-error/40 hover:bg-error/30 hover:border-error/60',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3 py-1.5',
        sm: 'h-7 rounded-sm px-2.5 text-[11px]',
        lg: 'h-10 rounded-md px-5 text-sm',
        icon: 'h-8 w-8 p-0',
        'icon-sm': 'h-6 w-6 p-0 text-[11px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
