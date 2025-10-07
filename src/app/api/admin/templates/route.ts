import { createApiHandler } from '@/lib/api-helpers'
import { db, whatsappTemplates, users } from '@/db'
import { eq, and, asc, inArray, isNull } from 'drizzle-orm'
import { getWIBTime } from '@/lib/datetime'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const templateQuerySchema = z.object({
  category: z.enum(['REMINDER', 'APPOINTMENT', 'EDUCATIONAL']).optional(),
  active: z.enum(['true', 'false']).optional().transform(val => val === 'true')
});

const createTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
  templateText: z.string().min(1, 'Template text is required'),
  variables: z.array(z.string()).optional().default([]),
  category: z.enum(['REMINDER', 'APPOINTMENT', 'EDUCATIONAL'])
});
// GET /api/admin/templates - Get all templates with filters
export const GET = createApiHandler(
  { auth: "required", query: templateQuerySchema },
  async (_, { user, query }) => {
    // Only admins and developers can access template management
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { category, active } = query || {};

    logger.info(`Fetching templates with filters: category=${category}, active=${active}`);

    // Build base query with filters - always exclude soft-deleted templates
    const conditions = [isNull(whatsappTemplates.deletedAt)]

    if (category) {
      conditions.push(eq(whatsappTemplates.category, category as 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'))
    }

    if (active !== undefined) {
      conditions.push(eq(whatsappTemplates.isActive, active === 'true'))
    }

    // Execute query with optional filters and ordering
    const templatesData = await db
      .select({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        templateText: whatsappTemplates.templateText,
        variables: whatsappTemplates.variables,
        category: whatsappTemplates.category,
        isActive: whatsappTemplates.isActive,
        createdBy: whatsappTemplates.createdBy,
        createdAt: whatsappTemplates.createdAt,
        updatedAt: whatsappTemplates.updatedAt
      })
      .from(whatsappTemplates)
      .where(and(...conditions))
      .orderBy(
        asc(whatsappTemplates.category),
        asc(whatsappTemplates.templateName)
      )

    // Get creator details for all templates
    const creatorIds = [...new Set(templatesData.map(t => t.createdBy).filter(Boolean))]
    const creatorDetails = creatorIds.length > 0 ? await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(inArray(users.id, creatorIds)) : []

    // Create creator lookup map
    const creatorMap = new Map()
    creatorDetails.forEach(creator => {
      creatorMap.set(creator.id, creator)
    })

    // Format response to match Prisma structure
    const templates = templatesData.map(template => ({
      id: template.id,
      templateName: template.templateName,
      templateText: template.templateText,
      variables: template.variables,
      category: template.category,
      isActive: template.isActive,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdByUser: creatorMap.get(template.createdBy) || null
    }))

    logger.info(`Retrieved ${templates.length} templates`);
    return { templates };
  }
);

// POST /api/admin/templates - Create new template
export const POST = createApiHandler(
  { auth: "required", body: createTemplateSchema },
  async (body, { user }) => {
    // Only admins and developers can create templates
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { templateName, templateText, variables, category } = body as {
      templateName: string;
      templateText: string;
      variables: string[];
      category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL';
    };

    logger.info(`Creating template: ${templateName} by user ${user!.id}`);

    // Check for duplicate template name
    const existingTemplate = await db
      .select({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName
      })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.templateName, templateName))
      .limit(1)

    if (existingTemplate.length > 0) {
      throw new Error('Template with this name already exists')
    }

    // Create template
    const newTemplate = await db
      .insert(whatsappTemplates)
      .values({
        templateName,
        templateText,
        variables: variables || [],
        category,
        createdBy: user!.id,
        isActive: true,
        createdAt: getWIBTime(),
        updatedAt: getWIBTime()
      })
      .returning({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        templateText: whatsappTemplates.templateText,
        variables: whatsappTemplates.variables,
        category: whatsappTemplates.category,
        isActive: whatsappTemplates.isActive,
        createdBy: whatsappTemplates.createdBy,
        createdAt: whatsappTemplates.createdAt,
        updatedAt: whatsappTemplates.updatedAt
      })

    const createdTemplate = newTemplate[0]

    // Get creator details
    const creatorDetails = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, user!.id))
      .limit(1)

    // Format response to match Prisma structure
    const template = {
      ...createdTemplate,
      createdByUser: creatorDetails.length > 0 ? creatorDetails[0] : null
    }

    logger.info(`Template ${templateName} created successfully`);
    return { template };
  }
);
