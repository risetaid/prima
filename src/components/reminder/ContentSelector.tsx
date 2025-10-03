'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, FileText, Play, ChevronDown, X, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { logger } from '@/lib/logger'

interface ContentItem {
  id: string
  title: string
  slug: string
  description?: string
  category: string
  tags: string[]
  publishedAt: Date | null
  createdAt: Date
  type: 'article' | 'video'
  thumbnailUrl?: string
  url: string
  excerpt?: string
  videoUrl?: string
  durationMinutes?: string
}

interface Category {
  value: string
  label: string
  icon: string
}

interface ContentSelectorProps {
  selectedContent: ContentItem[]
  onContentChange: (content: ContentItem[]) => void
  maxSelection?: number
  className?: string
}

export function ContentSelector({ 
  selectedContent, 
  onContentChange, 
  maxSelection = 5,
  className = '' 
}: ContentSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<ContentItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'article' | 'video'>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Pagination
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  // Fetch content from API
  const fetchContent = useCallback(async (reset = false) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: reset ? '1' : page.toString(),
        limit: '10',
        search: searchQuery,
        category: selectedCategory,
        type: selectedType === 'all' ? 'all' : selectedType,
        public: 'true'
      })

      const response = await fetch(`/api/cms/content?${params}&public=true`)
      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }

      const data = await response.json()
      if (data.success) {
        if (reset) {
          setContent(data.data)
          setPage(1)
        } else {
          setContent(prev => [...prev, ...data.data])
        }
        setHasMore(data.pagination.hasMore)
      } else {
        setError(data.error || 'Failed to fetch content')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, selectedType, page])

  // Fetch categories - using static data for now since API endpoint doesn't exist
  const fetchCategories = useCallback(async () => {
    // Static categories based on the database enum
    const staticCategories: Category[] = [
      { value: 'GENERAL', label: 'Umum', icon: '📄' },
      { value: 'NUTRITION', label: 'Nutrisi', icon: '🥗' },
      { value: 'EXERCISE', label: 'Olahraga', icon: '🏃‍♀️' },
      { value: 'MOTIVATIONAL', label: 'Motivasi', icon: '💪' },
      { value: 'MEDICAL', label: 'Medis', icon: '⚕️' },
      { value: 'FAQ', label: 'FAQ', icon: '❓' },
    ]
    setCategories(staticCategories)
  }, [])

  // Load content when expanded or filters change
  useEffect(() => {
    if (isExpanded) {
      fetchContent(true)
    }
  }, [isExpanded, searchQuery, selectedCategory, selectedType, fetchContent])

  // Load categories when expanded
  useEffect(() => {
    if (isExpanded) {
      fetchCategories()
    }
  }, [isExpanded, fetchCategories])

  // Handle content selection
  const handleContentToggle = (item: ContentItem) => {
    const isSelected = selectedContent.some(c => c.id === item.id)
    
    if (isSelected) {
      onContentChange(selectedContent.filter(c => c.id !== item.id))
    } else {
      if (selectedContent.length < maxSelection) {
        onContentChange([...selectedContent, item])
      }
    }
  }

  // Clear all selections
  const clearSelection = () => {
    onContentChange([])
  }

  // Load more content
  const loadMore = () => {
    setPage(prev => prev + 1)
    fetchContent()
  }

  const getCategoryLabel = (category: string) => {
    const categoryData = categories.find(c => c.value === category)
    return categoryData?.label || category
  }

  try {
    if (!isExpanded) {
      return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-4 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-medium text-gray-900">
                Lampiran Konten
              </h3>
              {selectedContent.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedContent.length}
                </Badge>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <span>Pilih Konten</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Content Preview */}
          {selectedContent.length > 0 && (
            <div className="mt-4 space-y-2">
              {selectedContent.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                      {item.type === 'article' ? (
                        <FileText className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Play className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-blue-900">{item.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleContentToggle(item)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Hapus Semua ({selectedContent.length})
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className={`bg-white border border-gray-200 rounded-2xl ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-medium text-gray-900">
              Pilih Konten Edukasi
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari artikel atau video..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipe</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as 'all' | 'article' | 'video')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="article">📄 Artikel</option>
                  <option value="video">🎥 Video</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="max-h-96 overflow-y-auto">
          {loading && content.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Memuat konten...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-600">
              <p className="text-sm">{error}</p>
              <button
                type="button"
                onClick={() => fetchContent(true)}
                className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!loading && !error && content.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Tidak ada konten ditemukan</p>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {content.map(item => {
              const isSelected = selectedContent.some(c => c.id === item.id)
              const canSelect = !isSelected && selectedContent.length < maxSelection

              return (
                <div key={item.id} className={`p-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start space-x-3">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {item.thumbnailUrl && !imageErrors.has(item.id) ? (
                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={item.thumbnailUrl}
                            alt={item.title}
                            width={64}
                            height={48}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageErrors(prev => new Set(prev).add(item.id))
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          {item.type === 'article' ? (
                            <FileText className="w-6 h-6 text-gray-400" />
                          ) : (
                            <Play className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                        {item.title}
                      </h4>
                      
                      {item.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          {item.type === 'article' ? (
                            <FileText className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          <span>{item.type === 'article' ? 'Artikel' : 'Video'}</span>
                        </span>
                        <span>•</span>
                        <span>{getCategoryLabel(item.category)}</span>
                        {item.durationMinutes && (
                          <>
                            <span>•</span>
                            <span>{item.durationMinutes} menit</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => window.open(item.url, '_blank')}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Lihat konten"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleContentToggle(item)}
                        disabled={!canSelect && !isSelected}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          isSelected 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : canSelect
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isSelected ? 'Terpilih' : 'Pilih'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load More */}
          {hasMore && !loading && content.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <button
                type="button"
                onClick={loadMore}
                className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Muat Lebih Banyak
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedContent.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedContent.length} dari {maxSelection} konten dipilih
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        )}
      </div>
    )
  } catch (error) {
    logger.error('ContentSelector error', error as Error)
    return (
      <div className={`bg-white border border-red-200 rounded-2xl p-4 ${className}`}>
        <div className="text-center text-red-600">
          <p className="text-sm">Gagal memuat konten</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    )
  }
}

