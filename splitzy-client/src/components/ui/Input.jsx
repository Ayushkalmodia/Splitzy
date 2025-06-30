import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(({
  className,
  type,
  error,
  ...props
}, ref) => {
  return (
    <div className="relative">
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-neutral-200 bg-white/80 backdrop-blur-sm px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input 