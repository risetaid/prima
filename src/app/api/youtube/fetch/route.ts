import { NextRequest, NextResponse } from 'next/server'
import { extractYouTubeVideoId } from '@/lib/youtube-utils'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL YouTube diperlukan' },
        { status: 400 }
      )
    }

    const videoId = extractYouTubeVideoId(url)
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'URL YouTube tidak valid' },
        { status: 400 }
      )
    }

    // Server-side HTML scraping (no CORS issues here)
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
    const response = await fetch(youtubeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Gagal mengambil data: HTTP ${response.status}` },
        { status: response.status }
      )
    }

    const html = await response.text()

    // Extract title
    const titleMatch = html.match(/<title>([^<]*)<\/title>/)
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : ''

    // Extract full description from JSON data (not just meta tag)
    let description = ''
    
    // Try to get full description from JSON-LD or video details
    const jsonDescMatch = html.match(/"shortDescription":"([^"]*(?:\\.[^"]*)*)"/);
    if (jsonDescMatch) {
      // Unescape JSON string
      description = jsonDescMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim()
    } else {
      // Fallback to meta tag (truncated)
      const metaDescMatch = html.match(/<meta name="description" content="([^"]*)"/) ||
                           html.match(/<meta property="og:description" content="([^"]*)"/)
      description = metaDescMatch ? metaDescMatch[1].trim() : ''
    }

    // Extract duration from video metadata
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/) || 
                         html.match(/"duration":"PT(\d+)M(\d+)S"/) ||
                         html.match(/"duration":"PT(\d+)S"/)
    let duration = ''

    if (durationMatch) {
      if (durationMatch[1] && !durationMatch[2]) {
        // Format: lengthSeconds or PT123S
        const totalSeconds = parseInt(durationMatch[1])
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        
        if (hours > 0) {
          duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        } else {
          duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
        }
      } else if (durationMatch[1] && durationMatch[2]) {
        // Format: PT1M30S
        const minutes = parseInt(durationMatch[1])
        const seconds = parseInt(durationMatch[2])
        duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
    }

    // Extract thumbnail
    const thumbnailMatch = html.match(/"thumbnails":\[{"url":"([^"]*)"/)
    const thumbnailUrl = thumbnailMatch ? thumbnailMatch[1] : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

    // Extract channel name
    const channelMatch = html.match(/"ownerChannelName":"([^"]*)"/) || 
                        html.match(/"author":"([^"]*)"/) ||
                        html.match(/<span class="[^"]*"[^>]*>([^<]+)<\/span>/)
    const channelName = channelMatch ? channelMatch[1] : ''

    const videoData = {
      title,
      description,
      thumbnailUrl,
      duration,
      channelName,
      videoId
    }

    console.log('YouTube data extracted:', videoData)

    return NextResponse.json({
      success: true,
      data: videoData
    })

  } catch (error) {
    console.error('Error fetching YouTube data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat mengambil data video' 
      },
      { status: 500 }
    )
  }
}