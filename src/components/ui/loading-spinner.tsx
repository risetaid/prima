import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  text?: string
  className?: string
}

export function LoadingOverlay({ isLoading, children, text, className }: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>

  return (
    <div className={cn('relative', className)}>
      {children}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-md">
        <LoadingSpinner text={text} />
      </div>
    </div>
  )
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean
  loadingText?: string
  children: React.ReactNode
}

export function LoadingButton({
  isLoading,
  loadingText = 'Memuat...',
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        isLoading && 'cursor-not-allowed',
        className
      )}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLoading ? loadingText : children}
    </button>
  )
}

