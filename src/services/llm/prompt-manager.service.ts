/**
 * LLM Prompt Manager Service
 * Provides utility functions for working with LLM prompts
 *
 * Note: Database-backed prompt templates have been removed from the schema.
 * This service now provides basic utility functions for prompt handling.
 */

// No imports needed for this utility service

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

/**
 * Basic prompt manager with utility functions
 * Database-backed templates have been removed from the schema
 */
export class PromptManager {
  /**
   * Extract template variables from a template string
   * Looks for variables in {variableName} format
   */
  extractVariables(templateString: string): PromptVariable[] {
    const variablePattern = /\{(\w+)\}/g
    const matches = [...templateString.matchAll(variablePattern)]
    const variableNames = [...new Set(matches.map(match => match[1]))]

    return variableNames.map(name => ({
      name,
      type: 'string' as const,
      required: true,
      description: `Variable: ${name}`,
    }))
  }

  /**
   * Render a simple prompt template with variables
   * Basic string replacement for {variable} placeholders
   */
  renderSimpleTemplate(
    template: string,
    variables: Record<string, unknown>
  ): string {
    let rendered = template

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value))
    }

    return rendered
  }

  /**
   * Create a basic rendered prompt structure
   * For use with simple hardcoded prompts
   */
  createRenderedPrompt(
    systemPrompt: string,
    userPrompt?: string,
    variables: Record<string, unknown> = {},
    options: {
      templateId?: string
      templateName?: string
      responseFormat?: 'json' | 'text'
      maxTokens?: number
      temperature?: number
    } = {}
  ): RenderedPrompt {
    return {
      systemPrompt,
      userPrompt,
      variables,
      templateId: options.templateId || 'inline',
      templateName: options.templateName || 'Inline Prompt',
      responseFormat: options.responseFormat || 'text',
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
    }
  }
}

// Export singleton instance
export const promptManager = new PromptManager()