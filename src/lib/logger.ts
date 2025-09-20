/**
 * Centralized logging utility for PRIMA system
 * Provides structured logging with different levels and contexts
 */

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export type LogValue =
  | string
  | number
  | boolean
  | null
  | Date
  | Error
  | object
  | LogValue[]
  | undefined;

export interface LogContext {
  userId?: string;
  patientId?: string;
  requestId?: string;
  operation?: string;
  duration?: number;
  [key: string]: LogValue;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
      case LogLevel.INFO:
        console.log(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, error);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Specialized logging methods for common operations
  auth(message: string, context?: LogContext): void {
    this.info(`🔐 Auth: ${message}`, context);
  }

  api(message: string, context?: LogContext): void {
    this.info(`🌐 API: ${message}`, context);
  }

  database(message: string, context?: LogContext): void {
    this.info(`💾 DB: ${message}`, context);
  }

  cache(message: string, context?: LogContext): void {
    this.debug(`⚡ Cache: ${message}`, context);
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`⚡ Performance: ${operation} completed in ${duration}ms`, {
      ...context,
      duration,
    });
  }

  security(message: string, context?: LogContext): void {
    this.warn(`🔒 Security: ${message}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();
