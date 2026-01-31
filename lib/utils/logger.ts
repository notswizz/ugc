/**
 * Logging utility with different log levels
 * Use this instead of console.log for better control in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private log(level: LogLevel, message: string, data?: any) {
    const logMessage: LogMessage = {
      level,
      message,
      data,
      timestamp: new Date(),
    };

    // In development, log everything
    if (this.isDevelopment) {
      switch (level) {
        case 'debug':
          console.log(`[DEBUG] ${message}`, data || '');
          break;
        case 'info':
          console.info(`[INFO] ${message}`, data || '');
          break;
        case 'warn':
          console.warn(`[WARN] ${message}`, data || '');
          break;
        case 'error':
          console.error(`[ERROR] ${message}`, data || '');
          break;
      }
    } else {
      // In production, only log warnings and errors
      if (level === 'warn' || level === 'error') {
        console[level](message, data || '');

        // TODO: Send to external logging service (Sentry, LogRocket, etc.)
        // this.sendToExternalService(logMessage);
      }
    }
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  /**
   * Log info message (development only)
   */
  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  /**
   * Log warning message (all environments)
   */
  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  /**
   * Log error message (all environments)
   */
  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  // TODO: Add integration with external logging service
  // private sendToExternalService(logMessage: LogMessage) {
  //   // Send to Sentry, LogRocket, etc.
  // }
}

// Export singleton instance
export const logger = new Logger();

// Re-export for convenience
export default logger;
