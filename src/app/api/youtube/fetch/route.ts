import { extractYouTubeVideoId } from '@/lib/youtube-utils'
import { createApiHandler } from '@/lib/api-helpers'
import { z } from 'zod'

import { logger } from '@/lib/logger';

// Validation schema for YouTube fetch request
const youtubeFetchSchema = z.object({
  url: z.string().url("Invalid YouTube URL")
});
export const POST = createApiHandler(
  {
    auth: "optional", // No authentication required for YouTube fetching
    body: youtubeFetchSchema
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
async function (body: { url: string }, _: any): Promise<{ success: boolean; data: { videoId: string; title?: string; description?: string; thumbnailUrl?: string } }> {
    const { url } = body

    const videoId = extractYouTubeVideoId(url)
    if (!videoId) {
      throw new Error('Invalid YouTube URL')
    }

    // Try oEmbed API first (no auth required, reliable)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      const oembedResponse = await fetch(oembedUrl)

      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json()

        // Get additional data from HTML scraping as fallback for missing fields
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
        const htmlResponse = await fetch(youtubeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })

        let duration = ''
        let channelName = ''

        if (htmlResponse.ok) {
          const html = await htmlResponse.text()

          // Extract duration from video metadata
          const durationMatch = html.match(/"lengthSeconds":"(\d+)"/) ||
            html.match(/"duration":"PT(\d+)M(\d+)S"/) ||
            html.match(/"duration":"PT(\d+)S"/)

          if (durationMatch) {
            if (durationMatch[1] && !durationMatch[2]) {
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
              const minutes = parseInt(durationMatch[1])
              const seconds = parseInt(durationMatch[2])
              duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
            }
          }

          // Extract channel name
          const channelMatch = html.match(/"ownerChannelName":"([^"]*)"/) ||
            html.match(/"author":"([^"]*)"/)
          channelName = channelMatch ? channelMatch[1] : oembedData.author_name || ''
        }

        const videoData = {
          title: oembedData.title || '',
          description: '', // oEmbed doesn't provide description
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          duration,
          channelName,
          videoId
        }

        logger.info('YouTube data extracted via oEmbed:', { value: videoData })

        return {
          success: true,
          data: videoData
        }
      }
    } catch {
      logger.warn('oEmbed failed, falling back to HTML scraping')
    }

    // Fallback to HTML scraping if oEmbed fails
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
    const response = await fetch(youtubeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube data: HTTP ${response.status}`)
    }

    const html = await response.text()

    // Extract title
    const titleMatch = html.match(/<title>([^<]*)<\/title>/)
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : ''

    // Extract description
    let description = ''
    const jsonDescMatch = html.match(/"shortDescription":"([^"]*(?:\\.[^"]*)*)"/);
    if (jsonDescMatch) {
      description = jsonDescMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim()
    } else {
      const metaDescMatch = html.match(/<meta name="description" content="([^"]*)"/) ||
        html.match(/<meta property="og:description" content="([^"]*)"/)
      description = metaDescMatch ? metaDescMatch[1].trim() : ''
    }

    // Extract duration
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/) ||
      html.match(/"duration":"PT(\d+)M(\d+)S"/) ||
      html.match(/"duration":"PT(\d+)S"/)
    let duration = ''

    if (durationMatch) {
      if (durationMatch[1] && !durationMatch[2]) {
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
        const minutes = parseInt(durationMatch[1])
        const seconds = parseInt(durationMatch[2])
        duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
    }

    // Extract channel name
    const channelMatch = html.match(/"ownerChannelName":"([^"]*)"/) ||
      html.match(/"author":"([^"]*)"/)
    const channelName = channelMatch ? channelMatch[1] : ''

    const videoData = {
      title,
      description,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration,
      channelName,
      videoId
    }

    logger.info('YouTube data extracted via scraping:', { value: videoData })

    return {
      success: true,
      data: videoData
    }
  }
);

