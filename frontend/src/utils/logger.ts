/**
 * Frontend logging utility for AroiHub
 * Provides structured logging with different log levels and environments
 */

// Log levels in order of severity
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Logger configuration
interface LoggerConfig {
  minLevel: LogLevel; // Minimum level to display logs for
  enableConsole: boolean; // Whether to output to console
  enableRemote: boolean; // Whether to send logs to a remote endpoint
  includeTimestamps: boolean; // Whether to include timestamps in logs
  remoteUrl?: string; // URL for remote logging endpoint
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  includeTimestamps: true,
  remoteUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/logs`
};

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    // Merge provided config with defaults
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Format a log message with additional context
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private formatMessage(level: LogLevel, message: string, ..._args: unknown[]): string {
    const timestamp = this.config.includeTimestamps ? `[${new Date().toISOString()}]` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}`;
  }



  /**
   * Check if a given log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Send log to remote endpoint if enabled
   */
  private async sendRemoteLog(level: LogLevel, message: string, ...args: unknown[]): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteUrl) return;

    try {
      // Only send important logs remotely (warn & error) to reduce traffic
      if (LOG_LEVELS[level] < LOG_LEVELS.warn) return;

      // Prepare log data
      const logData = {
        level,
        message,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        args: args.map(arg => {
          // Handle errors specially
          if (arg instanceof Error) {
            return {
              name: arg.name,
              message: arg.message,
              stack: arg.stack
            };
          }
          // Try to safely stringify objects
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch {
            return 'Unstringifiable object';
          }
        })
      };

      // Send to backend
      const response = await fetch(this.config.remoteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData),
        // Don't wait for response - fire and forget
        keepalive: true
      });

      // Check for errors but don't block
      if (!response.ok) {
        console.error('Failed to send log to server:', response.status);
      }
    } catch (error) {
      // Never fail the app because of logging
      console.error('Error sending remote log:', error);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;

    if (this.config.enableConsole) {
      console.debug(this.formatMessage('debug', message), ...args);
    }

    this.sendRemoteLog('debug', message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;

    if (this.config.enableConsole) {
      console.info(this.formatMessage('info', message), ...args);
    }

    this.sendRemoteLog('info', message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;

    if (this.config.enableConsole) {
      console.warn(this.formatMessage('warn', message), ...args);
    }

    this.sendRemoteLog('warn', message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;

    if (this.config.enableConsole) {
      console.error(this.formatMessage('error', message), ...args);
    }

    this.sendRemoteLog('error', message, ...args);
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Disable all console logs (for production)
   */
  disableConsole(): void {
    this.config.enableConsole = false;
  }

  /**
   * Enable all console logs (for development)
   */
  enableConsole(): void {
    this.config.enableConsole = true;
  }

  /**
   * Enable remote logging
   */
  enableRemoteLogging(url?: string): void {
    this.config.enableRemote = true;
    if (url) {
      this.config.remoteUrl = url;
    }
  }

  /**
   * Disable remote logging
   */
  disableRemoteLogging(): void {
    this.config.enableRemote = false;
  }
}

// Create and export a singleton instance
const logger = new Logger();

// In production, disable debug & info logs by default
if (process.env.NODE_ENV === 'production') {
  logger.updateConfig({ minLevel: 'warn' });
}

export default logger;