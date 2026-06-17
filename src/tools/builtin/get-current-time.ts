import { Logger } from '../../src/utils/logger';

/**
 * Get Current Time tool - returns current date and time
 */
export class GetCurrentTimeTool {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Execute get current time tool
   * @param args - Optional arguments (timezone, format)
   * @returns Current date and time information
   */
  async execute(args: any): Promise<any> {
    const timezone = args.timezone || 'UTC';
    const format = args.format || 'iso';

    this.logger.info('Get current time tool executed', { timezone, format });

    try {
      const now = new Date();
      
      // Get time in specified timezone
      let datetime: string;
      let timestamp: number;
      let timezoneOffset: string;

      if (timezone === 'UTC') {
        datetime = now.toUTCString();
        timestamp = now.getTime();
        timezoneOffset = 'Z';
      } else if (timezone === 'local' || timezone === 'Local') {
        datetime = now.toLocaleString();
        timestamp = now.getTime();
        timezoneOffset = now.getTimezoneOffset() > 0 
          ? `-${Math.floor(Math.abs(now.getTimezoneOffset()) / 60)}:${(Math.abs(now.getTimezoneOffset()) % 60).toString().padStart(2, '0')}`
          : `+${Math.floor(Math.abs(now.getTimezoneOffset()) / 60)}:${(Math.abs(now.getTimezoneOffset()) % 60).toString().padStart(2, '0')}`;
      } else {
        // Try to use Intl.DateTimeFormat for specific timezone
        try {
          datetime = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).format(now);
          timestamp = now.getTime();
          timezoneOffset = timezone;
        } catch (error) {
          // Fallback to UTC if timezone is invalid
          this.logger.warn('Invalid timezone, falling back to UTC', { timezone });
          datetime = now.toUTCString();
          timestamp = now.getTime();
          timezoneOffset = 'Z';
        }
      }

      // Format output
      let formatted: string;
      switch (format.toLowerCase()) {
        case 'iso':
          formatted = now.toISOString();
          break;
        case 'utc':
          formatted = now.toUTCString();
          break;
        case 'locale':
          formatted = now.toLocaleString();
          break;
        case 'unix':
          formatted = Math.floor(now.getTime() / 1000).toString();
          break;
        default:
          formatted = now.toISOString();
      }

      const result = {
        timestamp: timestamp,
        datetime: datetime,
        timezone: timezoneOffset,
        formatted: formatted,
        components: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
          hour: now.getHours(),
          minute: now.getMinutes(),
          second: now.getSeconds(),
          millisecond: now.getMilliseconds(),
          dayOfWeek: now.getDay(), // 0 = Sunday, 6 = Saturday
          dayOfWeekName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]
        }
      };

      this.logger.info('Get current time tool result', {
        timestamp,
        timezone: timezoneOffset
      });

      return result;
    } catch (error: any) {
      this.logger.error('Get current time tool error', {
        error: error.message
      });
      throw new Error(`Get current time error: ${error.message}`);
    }
  }
}
