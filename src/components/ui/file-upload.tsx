'use client'

import { useState } from 'react'
import { Button } from './button'

interface FileUploadProps {
  onUpload: (url: string) => void
  accept?: string
  maxSize?: number
}

export function FileUpload({ onUpload, accept = "image/*", maxSize = 5 * 1024 * 1024 }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB.')
      return
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const { url } = await response.json()
      onUpload(url)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept={accept}
        onChange={handleFileUpload}
        disabled={uploading}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button 
          type="button" 
          disabled={uploading}
          className="cursor-pointer"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </Button>
      </label>
    </div>
  )
}