import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Card = forwardRef(({
  className,
  variant = 'default',
  ...props
}, ref) => {
  const variants = {
    default: 'bg-white/80 backdrop-blur-lg border border-neutral-200 hover:border-teal-100 transition-all duration-300 hover:shadow-lg hover:shadow-teal-100',
    elevated: 'bg-white/90 backdrop-blur-lg border border-neutral-200 shadow-lg shadow-neutral-100/50 hover:shadow-xl hover:shadow-teal-100/50 transition-all duration-300',
    ghost: 'bg-transparent hover:bg-white/50 backdrop-blur-sm transition-all duration-300'
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl p-6',
        variants[variant],
        className
      )}
      {...props}
    />
  )
})

Card.displayName = 'Card'

const CardHeader = forwardRef(({
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
))

CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef(({
  className,
  ...props
}, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold text-neutral-900', className)}
    {...props}
  />
))

CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef(({
  className,
  ...props
}, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-600', className)}
    {...props}
  />
))

CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef(({
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('pt-0', className)}
    {...props}
  />
))

CardContent.displayName = 'CardContent'

const CardFooter = forwardRef(({
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
))

CardFooter.displayName = 'CardFooter'

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} 