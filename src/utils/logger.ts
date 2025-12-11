import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_FILE = join(LOG_DIR, 'optimizer.log');

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch (error) {
    // If we can't create logs directory, just log to stdout/stderr
    console.warn('Failed to create logs directory, logging to console only');
  }
}

const logStream = existsSync(LOG_DIR) 
  ? createWriteStream(LOG_FILE, { flags: 'a' })
  : null;

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private static formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
  }

  static debug(message: string, data?: any): void {
    const formatted = this.formatMessage(LogLevel.DEBUG, message, data);
    process.stdout.write(formatted);
    if (logStream) {
      try {
        logStream.write(formatted);
      } catch (error) {
        // Ignore write errors
      }
    }
  }

  static info(message: string, data?: any): void {
    const formatted = this.formatMessage(LogLevel.INFO, message, data);
    process.stdout.write(formatted);
    if (logStream) {
      try {
        logStream.write(formatted);
      } catch (error) {
        // Ignore write errors
      }
    }
  }

  static warn(message: string, data?: any): void {
    const formatted = this.formatMessage(LogLevel.WARN, message, data);
    process.stdout.write(formatted);
    if (logStream) {
      try {
        logStream.write(formatted);
      } catch (error) {
        // Ignore write errors
      }
    }
  }

  static error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    const formatted = this.formatMessage(LogLevel.ERROR, message, errorData);
    process.stderr.write(formatted);
    if (logStream) {
      try {
        logStream.write(formatted);
      } catch (error) {
        // Ignore write errors
      }
    }
  }
}

