'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname()
  
  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname)

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <nav className={cn("flex items-center space-x-2 text-sm text-gray-600", className)}>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1
        const Icon = item.icon
        
        return (
          <div key={item.href} className="flex items-center space-x-2">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            
            {isLast ? (
              <span className="font-medium text-gray-900 flex items-center gap-1">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Auto-generate breadcrumbs from pathname
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home
    }
  ]

  // Healthcare-specific path mapping
  const pathMapping: Record<string, string> = {
    'dashboard': 'Dashboard',
    'pasien': 'Data Pasien', 
    'pengingat': 'Pengingat Obat',
    'cms': 'Manajemen Konten',
    'articles': 'Artikel',
    'videos': 'Video',
    'create': 'Buat Baru',
    'edit': 'Edit',
    'admin': 'Administrasi',
    'users': 'Pengguna',
    'templates': 'Template Pesan',
    'tambah': 'Tambah',
    'gejala': 'Gejala',
    'terjadwal': 'Terjadwal',
    'selesai': 'Selesai',
    'semua': 'Semua',
    'perlu-diperbarui': 'Perlu Diperbarui'
  }

  let currentPath = ''
  
  segments.forEach((segment, index) => {
    // Skip the first 'dashboard' segment as it's already included
    if (index === 0 && segment === 'dashboard') {
      currentPath = '/dashboard'
      return
    }
    
    currentPath += `/${segment}`
    
    // Handle dynamic routes (like [id])
    if (segment.length > 10 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
      // Skip UUIDs and long segments (likely IDs)
      return
    }
    
    const label = pathMapping[segment] || formatSegment(segment)
    
    breadcrumbs.push({
      label,
      href: currentPath
    })
  })

  return breadcrumbs
}

// Format segment for display
function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Specialized breadcrumb components for specific pages
export function CMSBreadcrumb() {
  const pathname = usePathname()
  
  const cmsItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'CMS', href: '/dashboard/cms' }
  ]

  if (pathname.includes('/articles')) {
    cmsItems.push({ label: 'Artikel', href: '/dashboard/cms/articles' })
    
    if (pathname.includes('/create')) {
      cmsItems.push({ label: 'Buat Artikel', href: pathname })
    } else if (pathname.includes('/edit')) {
      cmsItems.push({ label: 'Edit Artikel', href: pathname })
    }
  } else if (pathname.includes('/videos')) {
    cmsItems.push({ label: 'Video', href: '/dashboard/cms/videos' })
    
    if (pathname.includes('/create')) {
      cmsItems.push({ label: 'Buat Video', href: pathname })
    } else if (pathname.includes('/edit')) {
      cmsItems.push({ label: 'Edit Video', href: pathname })
    }
  }

  return <Breadcrumb items={cmsItems} />
}

export function PatientBreadcrumb() {
  const pathname = usePathname()
  
  const patientItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Data Pasien', href: '/dashboard/pasien' }
  ]

  if (pathname.includes('/tambah')) {
    patientItems.push({ label: 'Tambah Pasien', href: pathname })
  } else if (pathname.includes('/edit')) {
    patientItems.push({ label: 'Edit Pasien', href: pathname })
  } else if (pathname.includes('/gejala')) {
    patientItems.push({ label: 'Gejala Pasien', href: pathname })
  }

  return <Breadcrumb items={patientItems} />
}

export function ReminderBreadcrumb() {
  const pathname = usePathname()
  
  const reminderItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Pengingat Obat', href: '/dashboard/pengingat' }
  ]

  if (pathname.includes('/terjadwal')) {
    reminderItems.push({ label: 'Terjadwal', href: pathname })
  } else if (pathname.includes('/selesai')) {
    reminderItems.push({ label: 'Selesai', href: pathname })
  } else if (pathname.includes('/semua')) {
    reminderItems.push({ label: 'Semua', href: pathname })
  } else if (pathname.includes('/perlu-diperbarui')) {
    reminderItems.push({ label: 'Perlu Diperbarui', href: pathname })
  } else if (pathname.includes('/tambah')) {
    reminderItems.push({ label: 'Tambah Pengingat', href: pathname })
  }

  return <Breadcrumb items={reminderItems} />
}