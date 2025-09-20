#!/usr/bin/env bun

/**
 * Script to start the message worker service
 * This handles processing of queued messages during LLM outages
 */

import { messageWorkerService } from '@/services/message-worker.service'
import { logger } from '@/lib/logger'

async function main() {
  logger.info('Starting PRIMA Message Worker Service')

  try {
    // Start the message worker
    messageWorkerService.start()

    logger.info('Message worker started successfully', {
      status: messageWorkerService.getStatus()
    })

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down message worker...')
      messageWorkerService.stop()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down message worker...')
      messageWorkerService.stop()
      process.exit(0)
    })

    // Keep the process running
    await new Promise(() => {}) // This will run indefinitely

  } catch (error) {
    logger.error('Failed to start message worker', error as Error)
    process.exit(1)
  }
}

main().catch((error) => {
  logger.error('Fatal error:', error)
  process.exit(1)
})