import winston from 'winston';
import { LoggingConfig } from '../types';

export class Logger {
  private logger: winston.Logger;

  constructor(config?: LoggingConfig) {
    const logLevel = config?.level || 'info';
    const logFile = config?.file;

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let metaStr = '';
            if (Object.keys(meta).length > 0) {
              metaStr = JSON.stringify(meta, null, 2);
            }
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
      })
    ];

    if (logFile) {
      transports.push(
        new winston.transports.File({
          filename: logFile,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      transports
    });
  }

  /**
   * Log error message
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}

// Export a default logger instance
export const defaultLogger = new Logger();
