/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

/**
 * Fetches YouTube video data using server-side API endpoint
 * Gets full data including description and duration via HTML scraping
 */
export async function fetchYouTubeVideoData(videoId: string) {
  try {
    const response = await fetch('/api/youtube/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        url: `https://www.youtube.com/watch?v=${videoId}` 
      })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Gagal mengambil data video')
    }

    return {
      title: result.data.title || '',
      description: result.data.description || '',
      thumbnailUrl: result.data.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: result.data.duration || '',
      channelName: result.data.channelName || ''
    }
  } catch (error) {
    console.error('Error fetching YouTube data:', error)
    throw new Error('Gagal mengambil data video. Pastikan URL valid dan video dapat diakses.')
  }
}

/**
 * Formats duration from seconds to readable format (e.g., "5:23")
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Gets YouTube thumbnail URL for a video ID
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality === 'maxres' ? 'maxresdefault' : quality}.jpg`
}

