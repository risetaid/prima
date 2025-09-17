/**
 * LLM Prompt Manager Service
 * Manages loading, rendering, and caching of LLM prompt templates
 */

import { db } from '@/db'
import { llmPromptTemplates } from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { responseCache } from '@/lib/response-cache'
import { LlmPromptTemplate, NewLlmPromptTemplate } from '@/db/schema'
import { ConversationContext } from './llm.types'

export interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date'
  required: boolean
  defaultValue?: unknown
  description?: string
}

export interface RenderedPrompt {
  systemPrompt: string
  userPrompt?: string
  variables: Record<string, unknown>
  templateId: string
  templateName: string
  responseFormat: 'json' | 'text'
  maxTokens: number
  temperature: number
}

export interface PromptTemplateConfig {
  category?: string
  tags?: string[]
  isActive?: boolean
  isDefault?: boolean
}

export class PromptManager {
  private cacheKey = 'llm:prompt:templates'
  private cacheTTL = 300000 // 5 minutes

  /**
   * Get a prompt template by name
   */
  async getTemplate(name: string): Promise<LlmPromptTemplate | null> {
    try {
      logger.debug('Fetching prompt template', { name })

      // Try cache first
      const cached = await responseCache.get(`${this.cacheKey}:${name}`, {})
      if (cached) {
        logger.debug('Using cached prompt template', { name })
        return JSON.parse(cached.response) as LlmPromptTemplate
      }

      // Fetch from database
      const [template] = await db
        .select()
        .from(llmPromptTemplates)
        .where(and(eq(llmPromptTemplates.name, name), eq(llmPromptTemplates.isActive, true)))

      if (template) {
        // Cache the result
        await responseCache.set(
          `${this.cacheKey}:${name}`,
          {},
          JSON.stringify(template),
          this.cacheTTL
        )
        
        // Update usage stats
        await this.updateTemplateUsage(template.id)
      }

      return template || null
    } catch (error) {
      logger.error('Failed to get prompt template', error as Error, { name })
      throw error
    }
  }

  /**
   * Get default template for a category
   */
  async getDefaultTemplate(category: string): Promise<LlmPromptTemplate | null> {
    try {
      logger.debug('Fetching default prompt template', { category })

      const [template] = await db
        .select()
        .from(llmPromptTemplates)
        .where(
          and(
            eq(llmPromptTemplates.category, category),
            eq(llmPromptTemplates.isActive, true),
            eq(llmPromptTemplates.isDefault, true)
          )
        )

      return template || null
    } catch (error) {
      logger.error('Failed to get default prompt template', error as Error, { category })
      throw error
    }
  }

  /**
   * List prompt templates with filtering
   */
  async listTemplates(config: PromptTemplateConfig = {}): Promise<LlmPromptTemplate[]> {
    try {
      logger.debug('Listing prompt templates', config as Record<string, unknown>)

      const conditions = [eq(llmPromptTemplates.isActive, true)]
      
      if (config.category) {
        conditions.push(eq(llmPromptTemplates.category, config.category))
      }
      
      if (config.isDefault !== undefined) {
        conditions.push(eq(llmPromptTemplates.isDefault, config.isDefault))
      }

      const templates = await db
        .select()
        .from(llmPromptTemplates)
        .where(and(...conditions))
        .orderBy(desc(llmPromptTemplates.updatedAt))

      // Filter by tags if specified
      if (config.tags && config.tags.length > 0) {
        return templates.filter(template => 
          template.tags?.some(tag => config.tags!.includes(tag))
        )
      }

      return templates
    } catch (error) {
      logger.error('Failed to list prompt templates', error as Error, config as Record<string, unknown>)
      throw error
    }
  }

  /**
   * Create a new prompt template
   */
  async createTemplate(template: NewLlmPromptTemplate): Promise<LlmPromptTemplate> {
    try {
      logger.info('Creating new prompt template', { 
        name: template.name, 
        category: template.category 
      })

      // Validate template variables
      this.validateTemplateVariables(template)

      const [created] = await db
        .insert(llmPromptTemplates)
        .values(template)
        .returning()

      // Clear cache
      await this.clearCache()

      logger.info('Prompt template created successfully', { 
        id: created.id, 
        name: created.name 
      })

      return created
    } catch (error) {
      logger.error('Failed to create prompt template', error as Error, { 
        name: template.name 
      })
      throw error
    }
  }

  /**
   * Update an existing prompt template
   */
  async updateTemplate(
    id: string, 
    updates: Partial<NewLlmPromptTemplate>
  ): Promise<LlmPromptTemplate> {
    try {
      logger.info('Updating prompt template', { id })

      // Validate template variables if system prompt is being updated
      if (updates.systemPrompt) {
        this.validateTemplateVariables({ ...updates, variables: [] })
      }

      const [updated] = await db
        .update(llmPromptTemplates)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(llmPromptTemplates.id, id))
        .returning()

      if (!updated) {
        throw new Error('Prompt template not found')
      }

      // Clear cache
      await this.clearCache()

      logger.info('Prompt template updated successfully', { 
        id, 
        name: updated.name 
      })

      return updated
    } catch (error) {
      logger.error('Failed to update prompt template', error as Error, { id })
      throw error
    }
  }

  /**
   * Delete a prompt template (soft delete)
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      logger.info('Deleting prompt template', { id })

      await db
        .update(llmPromptTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(llmPromptTemplates.id, id))

      // Clear cache
      await this.clearCache()

      logger.info('Prompt template deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete prompt template', error as Error, { id })
      throw error
    }
  }

  /**
   * Render a prompt template with context variables
   */
  async renderTemplate(
    templateName: string, 
    context: ConversationContext,
    additionalVariables?: Record<string, unknown>
  ): Promise<RenderedPrompt> {
    try {
      logger.debug('Rendering prompt template', { 
        templateName, 
        patientId: context.patientId 
      })

      const template = await this.getTemplate(templateName)
      if (!template) {
        throw new Error(`Prompt template '${templateName}' not found`)
      }

      // Prepare variables
      const variables = this.prepareVariables(context, additionalVariables)

      // Render system prompt
      const systemPrompt = this.renderString(template.systemPrompt, variables)

      // Render user prompt if available
      let userPrompt: string | undefined
      if (template.userPromptTemplate) {
        userPrompt = this.renderString(template.userPromptTemplate, variables)
      }

      const rendered: RenderedPrompt = {
        systemPrompt,
        userPrompt,
        variables,
        templateId: template.id,
        templateName: template.name,
        responseFormat: template.responseFormat,
        maxTokens: template.maxTokens,
        temperature: template.temperature / 100, // Convert from 0-100 to 0-1
      }

      logger.debug('Prompt template rendered successfully', {
        templateName,
        variableCount: Object.keys(variables).length,
      })

      return rendered
    } catch (error) {
      logger.error('Failed to render prompt template', error as Error, { 
        templateName,
        patientId: context.patientId 
      })
      throw error
    }
  }

  /**
   * Get template variables from a template string
   */
  extractVariables(templateString: string): PromptVariable[] {
    const variablePattern = /\{(\w+)\}/g
    const matches = [...templateString.matchAll(variablePattern)]
    const variableNames = [...new Set(matches.map(match => match[1]))]

    return variableNames.map(name => ({
      name,
      type: 'string',
      required: true,
      description: `Variable: ${name}`,
    }))
  }

  /**
   * Validate template variables
   */
  private validateTemplateVariables(template: Partial<NewLlmPromptTemplate>): void {
    if (!template.systemPrompt) return

    const variables = this.extractVariables(template.systemPrompt)
    const templateVariables = template.variables || []

    // Check if all variables in template are defined
    const undefinedVariables = variables.filter(
      v => !templateVariables.includes(v.name)
    )

    if (undefinedVariables.length > 0) {
      logger.warn('Undefined variables in template', {
        undefinedVariables: undefinedVariables.map(v => v.name),
      })
    }
  }

  /**
   * Prepare variables for rendering
   */
  private prepareVariables(
    context: ConversationContext,
    additionalVariables?: Record<string, unknown>
  ): Record<string, unknown> {
    const variables: Record<string, unknown> = {
      // Patient information
      patientName: context.patientInfo?.name || 'Pasien yang terhormat',
      patientId: context.patientId,
      phoneNumber: context.phoneNumber,
      verificationStatus: context.patientInfo?.verificationStatus || 'Unknown',
      
      // Conversation context
      conversationId: context.conversationId,
      messageCount: context.previousMessages.length,
      
      // Active reminders
      activeReminders: context.patientInfo?.activeReminders || [],
      activeRemindersCount: context.patientInfo?.activeReminders?.length || 0,
      
      // Timestamps
      currentTime: new Date().toISOString(),
      currentDate: new Date().toLocaleDateString('id-ID'),
      currentTimeWIB: new Date().toLocaleTimeString('id-ID', { 
        timeZone: 'Asia/Jakarta' 
      }),
    }

    // Add additional variables
    if (additionalVariables) {
      Object.assign(variables, additionalVariables)
    }

    return variables
  }

  /**
   * Render a string with variables
   */
  private renderString(template: string, variables: Record<string, unknown>): string {
    let rendered = template

    // Replace variables in format {variableName}
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`
      let replacement: string

      if (value === null || value === undefined) {
        replacement = ''
      } else if (typeof value === 'object') {
        replacement = JSON.stringify(value)
      } else {
        replacement = String(value)
      }

      rendered = rendered.replace(new RegExp(placeholder, 'g'), replacement)
    }

    return rendered
  }

  /**
   * Update template usage statistics
   */
  private async updateTemplateUsage(templateId: string): Promise<void> {
    try {
      await db
        .update(llmPromptTemplates)
        .set({
          usageCount: sql`${llmPromptTemplates.usageCount} + 1`,
          lastUsedAt: new Date(),
        })
        .where(eq(llmPromptTemplates.id, templateId))
    } catch (error) {
      logger.error('Failed to update template usage', error as Error, { templateId })
      // Don't throw here as this is not critical
    }
  }

  /**
   * Clear all cached templates
   */
  private async clearCache(): Promise<void> {
    try {
      // Since we can't clear by pattern, we'll clear the entire cache
      // This is acceptable as prompt templates don't change frequently
      await responseCache.clear()
    } catch (error) {
      logger.error('Failed to clear prompt template cache', error as Error)
      // Don't throw here as this is not critical
    }
  }
}

// Export singleton instance
export const promptManager = new PromptManager()