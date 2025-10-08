import { createApiHandler } from '@/lib/api-helpers'
import { db, whatsappTemplates, users } from '@/db'
import { eq, and, asc, inArray, isNull, count } from 'drizzle-orm'
import { getWIBTime } from '@/lib/datetime'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const templateQuerySchema = z.object({
  category: z.enum(['REMINDER', 'APPOINTMENT', 'EDUCATIONAL']).optional(),
  active: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
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

    const { category, active, page = 1, limit = 20 } = query || {};
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    logger.info(`Fetching templates with filters: category=${category}, active=${active}, page=${page}, limit=${limit}`, {
      category,
      active,
      page,
      limit,
      offset,
      activeType: typeof active,
      activeIsUndefined: active === undefined,
      activeIsEmpty: active === ''
    });

    // Build base query with filters - always exclude soft-deleted templates
    const conditions = [isNull(whatsappTemplates.deletedAt)]

    if (category) {
      conditions.push(eq(whatsappTemplates.category, category as 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'))
      logger.info('🔧 Adding category filter', { category });
    }

    if (active !== undefined && active !== '') {
      conditions.push(eq(whatsappTemplates.isActive, active === 'true'))
      logger.info('🔧 Adding active filter', { active, willMatch: active === 'true' });
    } else {
      logger.info('🔧 Skipping active filter - active is empty or undefined', { active });
    }

    logger.info('🔍 Template query conditions', {
      conditionsCount: conditions.length,
      hasCategoryFilter: !!category,
      hasActiveFilter: active !== undefined,
      categoryFilter: category,
      activeFilter: active
    });

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(whatsappTemplates)
      .where(and(...conditions));
    
    const totalCount = totalCountResult[0]?.count || 0;

    // Execute query with optional filters, ordering, and pagination
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
      .limit(limitNum)
      .offset(offset)

    logger.info('📊 Template query result', {
      templatesFound: templatesData.length,
      firstTemplate: templatesData[0] ? {
        id: templatesData[0].id,
        name: templatesData[0].templateName,
        category: templatesData[0].category,
        isActive: templatesData[0].isActive
      } : null
    });

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

    logger.info(`✅ Final template response`, {
      templatesCount: templates.length,
      totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      templateNames: templates.map(t => ({ id: t.id, name: t.templateName, category: t.category }))
    });
    
    return {
      templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      }
    };
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
