import React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  type?: 'info' | 'success' | 'warning' | 'error'
  confirmText?: string
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  confirmText = 'OK'
}: AlertModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-amber-500" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />
      default:
        return <Info className="h-6 w-6 text-blue-500" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

