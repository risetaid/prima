import { createApiHandler, z } from '@/lib/api-helpers'
import { db, whatsappTemplates } from '@/db'
import { eq, and, asc } from 'drizzle-orm'
import { get, set, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { logger } from '@/lib/logger'

const templatesQuerySchema = z.object({
  category: z.enum(['REMINDER', 'APPOINTMENT', 'EDUCATIONAL']).optional(),
})

// GET /api/templates - Get WhatsApp templates with caching
export const GET = createApiHandler(
  {
    auth: 'required',
    query: templatesQuerySchema,
    cache: { ttl: CACHE_TTL.TEMPLATES, key: CACHE_KEYS.templates }
  },
  async (_, { user, query }) => {
    const { category } = query!

    // Create cache key based on category filter
    const cacheKey = category ? `${CACHE_KEYS.templates}:${category}` : CACHE_KEYS.templates

    // Try to get from cache first
    const cachedTemplates = await get(cacheKey)

    if (cachedTemplates) {
      return cachedTemplates
    }

    // Build Drizzle query with conditional where clause
    const baseQuery = db
      .select({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        templateText: whatsappTemplates.templateText,
        variables: whatsappTemplates.variables,
        category: whatsappTemplates.category,
        createdAt: whatsappTemplates.createdAt
      })
      .from(whatsappTemplates)
      .where(
        category 
          ? and(eq(whatsappTemplates.isActive, true), eq(whatsappTemplates.category, category))
          : eq(whatsappTemplates.isActive, true)
      )
      .orderBy(asc(whatsappTemplates.category), asc(whatsappTemplates.templateName))

    const templates = await baseQuery

    // Group templates by category
    const groupedTemplates = templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    }, {} as Record<string, typeof templates>)

    const response = { 
      templates,
      grouped: groupedTemplates
    }
    
    // Cache the templates (longer TTL since they don't change often)
    await set(cacheKey, response, CACHE_TTL.TEMPLATES)

    return response
  }
);

