import { createApiHandler } from '@/lib/api-helpers'
import { db, whatsappTemplates, users } from '@/db'
import { eq } from 'drizzle-orm'
import { getWIBTime } from '@/lib/datetime'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const templateIdParamSchema = z.object({
  id: z.string().uuid(),
});

const updateTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required').optional(),
  templateText: z.string().min(1, 'Template text is required').optional(),
  variables: z.array(z.string()).optional(),
  category: z.enum(['REMINDER', 'APPOINTMENT', 'EDUCATIONAL']).optional(),
  isActive: z.boolean().optional()
});
// GET /api/admin/templates/[id] - Get specific template
export const GET = createApiHandler(
  { auth: "required", params: templateIdParamSchema },
  async (_, { user, params }) => {
    // Only admins and developers can access template management
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { id } = params!;

    logger.info(`Fetching template ${id} by user ${user!.id}`);

    // Get template with creator details using separate queries
    const templateResult = await db
      .select({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        templateText: whatsappTemplates.templateText,
        variables: whatsappTemplates.variables,
        category: whatsappTemplates.category,
        isActive: whatsappTemplates.isActive,
        createdBy: whatsappTemplates.createdBy,
        createdAt: whatsappTemplates.createdAt,
        updatedAt: whatsappTemplates.updatedAt,
      })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, id))
      .limit(1);

    if (templateResult.length === 0) {
      throw new Error("Template not found");
    }

    const templateData = templateResult[0];

    // Get creator details if available
    let createdByUser = null;
    if (templateData.createdBy) {
      const creatorResult = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, templateData.createdBy))
        .limit(1);

      createdByUser = creatorResult.length > 0 ? creatorResult[0] : null;
    }

    const template = {
      ...templateData,
      createdByUser,
    };

    logger.info(`Template ${id} retrieved successfully`);
    return { template };
  }
);

// PUT /api/admin/templates/[id] - Update template
export const PUT = createApiHandler(
  { auth: "required", params: templateIdParamSchema, body: updateTemplateSchema },
  async (body, { user, params }) => {
    // Only admins and developers can update templates
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { id } = params!;
    const { templateName, templateText, variables, category, isActive } = body as {
      templateName?: string;
      templateText?: string;
      variables?: string[];
      category?: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL';
      isActive?: boolean;
    };

    logger.info(`Updating template ${id} by user ${user!.id}`);

    // Check if template exists
    const existingTemplateResult = await db
      .select({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        createdBy: whatsappTemplates.createdBy,
      })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, id))
      .limit(1);

    if (existingTemplateResult.length === 0) {
      throw new Error("Template not found");
    }

    const existingTemplate = existingTemplateResult[0];

    // Check for duplicate template name (excluding current template)
    if (templateName && templateName !== existingTemplate.templateName) {
      const duplicateResult = await db
        .select({ id: whatsappTemplates.id })
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.templateName, templateName))
        .limit(1);

      if (duplicateResult.length > 0) {
        throw new Error("Template with this name already exists");
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: getWIBTime()
    };

    if (templateName !== undefined) updateData.templateName = templateName;
    if (templateText !== undefined) updateData.templateText = templateText;
    if (variables !== undefined) updateData.variables = variables;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update template
    const updatedTemplateResult = await db
      .update(whatsappTemplates)
      .set(updateData)
      .where(eq(whatsappTemplates.id, id))
      .returning({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        templateText: whatsappTemplates.templateText,
        variables: whatsappTemplates.variables,
        category: whatsappTemplates.category,
        isActive: whatsappTemplates.isActive,
        createdBy: whatsappTemplates.createdBy,
        createdAt: whatsappTemplates.createdAt,
        updatedAt: whatsappTemplates.updatedAt,
      });

    const templateData = updatedTemplateResult[0];

    // Get creator details if available
    let createdByUser = null;
    if (templateData.createdBy) {
      const creatorResult = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, templateData.createdBy))
        .limit(1);

      createdByUser = creatorResult.length > 0 ? creatorResult[0] : null;
    }

    const template = {
      ...templateData,
      createdByUser,
    };

    logger.info(`Template ${id} updated successfully`);
    return { template };
  }
);

// DELETE /api/admin/templates/[id] - Delete template (soft delete)
export const DELETE = createApiHandler(
  { auth: "required", params: templateIdParamSchema },
  async (_, { user, params }) => {
    // Only admins and developers can delete templates
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { id } = params!;

    logger.info(`Deleting template ${id} by user ${user!.id}`);

    // Check if template exists
    const existingTemplateResult = await db
      .select({ id: whatsappTemplates.id })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, id))
      .limit(1);

    if (existingTemplateResult.length === 0) {
      throw new Error("Template not found");
    }

    // Soft delete by setting deletedAt timestamp
    const templateResult = await db
      .update(whatsappTemplates)
      .set({
        deletedAt: getWIBTime(),
        isActive: false,
        updatedAt: getWIBTime(),
      })
      .where(eq(whatsappTemplates.id, id))
      .returning();

    const template = templateResult[0];

    logger.info(`Template ${id} deleted successfully`);
    return {
      message: "Template deactivated successfully",
      template,
    };
  }
);
