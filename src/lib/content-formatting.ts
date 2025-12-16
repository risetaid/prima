/**
 * Content formatting utilities for WhatsApp messages
 * Centralizes icon and prefix logic to follow DRY principle
 */

export type ContentType = 'article' | 'video' | 'other';

export interface ContentItem {
  id: string;
  type: string;
  title: string;
  url: string;
}

/**
 * Get content prefix based on type
 */
export function getContentPrefix(contentType: string): string {
  switch (contentType?.toLowerCase()) {
    case 'article':
      return '📚 Baca juga:';
    case 'video':
      return '🎥 Tonton juga:';
    default:
      return '📖 Lihat juga:';
  }
}

/**
 * Get content icon based on type
 */
export function getContentIcon(contentType: string): string {
  switch (contentType?.toLowerCase()) {
    case 'article':
      return '📄';
    case 'video':
      return '🎥';
    default:
      return '📖';
  }
}

/**
 * Format content items for WhatsApp message
 * Groups by type and adds proper formatting
 */
export function formatContentForWhatsApp(
  baseMessage: string,
  attachedContent: ContentItem[]
): string {
  if (!attachedContent || attachedContent.length === 0) return baseMessage;

  let message = baseMessage;
  const contentByType: Record<string, ContentItem[]> = {};

  // Group content by type
  for (const content of attachedContent) {
    const type = content.type?.toLowerCase() || 'other';
    if (!contentByType[type]) contentByType[type] = [];
    contentByType[type].push(content);
  }

  // Add content sections
  for (const contentType of Object.keys(contentByType)) {
    const contents = contentByType[contentType];
    message += `\n\n${getContentPrefix(contentType)}`;
    for (const c of contents) {
      const icon = getContentIcon(c.type);
      message += `\n${icon} ${c.title}`;
      message += `\n   ${c.url}`;
    }
  }

  message += '\n\n💙 Tim PRIMA';
  return message;
}
