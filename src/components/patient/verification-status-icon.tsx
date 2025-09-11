'use client'

interface VerificationStatusIconProps {
  status: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function VerificationStatusIcon({ 
  status, 
  size = 'medium', 
  className = '' 
}: VerificationStatusIconProps) {
  const iconMap: Record<string, string> = {
    pending_verification: '⏳',
    verified: '✅',
    declined: '❌',
    expired: '⏰',
    unsubscribed: '🛑'
  }
  
  const backgroundMap: Record<string, string> = {
    pending_verification: 'bg-yellow-100',
    verified: 'bg-green-100',
    declined: 'bg-red-100',
    expired: 'bg-orange-100',
    unsubscribed: 'bg-gray-100'
  }
  
  const sizeClasses = {
    small: 'w-8 h-8 text-lg',
    medium: 'w-12 h-12 text-2xl',
    large: 'w-16 h-16 text-3xl'
  }
  
  const icon = iconMap[status] || '❓'
  const bgColor = backgroundMap[status] || 'bg-gray-100'
  const sizeClass = sizeClasses[size]
  
  return (
    <div className={`${sizeClass} ${bgColor} rounded-full flex items-center justify-center ${className}`}>
      {icon}
    </div>
  )
}

