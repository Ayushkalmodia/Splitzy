import { cn } from '../../lib/utils'

const Skeleton = ({ 
  className, 
  ...props 
}) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-neutral-200',
        className
      )}
      {...props}
    />
  )
}

const SkeletonCard = ({ 
  className,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        'bg-white rounded-xl p-6 shadow-sm border border-neutral-100',
        className
      )}
      {...props}
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-24 bg-neutral-200" />
        <Skeleton className="h-8 w-32 bg-neutral-300" />
        <Skeleton className="h-3 w-16 bg-neutral-200" />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonCard }
