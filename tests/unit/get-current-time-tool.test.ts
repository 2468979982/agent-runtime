import { GetCurrentTimeTool } from '../../src/tools/builtin/get-current-time';
import { Logger } from '../../src/utils/logger';

describe('GetCurrentTimeTool', () => {
  let getTimeTool: GetCurrentTimeTool;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    getTimeTool = new GetCurrentTimeTool(mockLogger);
  });

  describe('execute', () => {
    it('should return current time in ISO format by default', async () => {
      const result = await getTimeTool.execute({});
      
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('datetime');
      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('formatted');
      expect(result).toHaveProperty('components');
      
      // Verify the formatted time is in ISO format
      expect(result.formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return time in UTC when timezone is UTC', async () => {
      const result = await getTimeTool.execute({ timezone: 'UTC', format: 'iso' });
      
      expect(result.timezone).toBe('Z');
      expect(result.formatted).toMatch(/Z$/);
    });

    it('should return time in local timezone when specified', async () => {
      const result = await getTimeTool.execute({ timezone: 'local', format: 'iso' });
      
      expect(result).toHaveProperty('formatted');
      expect(result.components).toHaveProperty('year');
      expect(result.components).toHaveProperty('month');
      expect(result.components).toHaveProperty('day');
      expect(result.components).toHaveProperty('hour');
      expect(result.components).toHaveProperty('minute');
      expect(result.components).toHaveProperty('second');
    });

    it('should return time in UTC format when format is utc', async () => {
      const result = await getTimeTool.execute({ format: 'utc' });
      
      expect(result.formatted).toMatch(/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
    });

    it('should return time in locale format when format is locale', async () => {
      const result = await getTimeTool.execute({ format: 'locale' });
      
      expect(result.formatted).toBeTruthy();
      expect(typeof result.formatted).toBe('string');
    });

    it('should return Unix timestamp when format is unix', async () => {
      const result = await getTimeTool.execute({ format: 'unix' });
      
      expect(result.formatted).toMatch(/^\d+$/);
      const unixTimestamp = parseInt(result.formatted);
      expect(unixTimestamp).toBeGreaterThan(0);
      expect(unixTimestamp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 1);
    });

    it('should handle invalid timezone gracefully', async () => {
      const result = await getTimeTool.execute({ timezone: 'Invalid/Timezone', format: 'iso' });
      
      // Should fallback to UTC
      expect(result.formatted).toMatch(/Z$/);
    });

    it('should include all components', async () => {
      const result = await getTimeTool.execute({});
      
      expect(result.components).toHaveProperty('year');
      expect(result.components).toHaveProperty('month');
      expect(result.components).toHaveProperty('day');
      expect(result.components).toHaveProperty('hour');
      expect(result.components).toHaveProperty('minute');
      expect(result.components).toHaveProperty('second');
      expect(result.components).toHaveProperty('millisecond');
      expect(result.components).toHaveProperty('dayOfWeek');
      expect(result.components).toHaveProperty('dayOfWeekName');
      
      // Verify dayOfWeekName is valid
      expect(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
        .toContain(result.components.dayOfWeekName);
    });

    it('should log info on successful execution', async () => {
      await getTimeTool.execute({ timezone: 'UTC', format: 'iso' });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Get current time tool executed',
        expect.any(Object)
      );
    });

    it('should log info with result', async () => {
      await getTimeTool.execute({});
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Get current time tool result',
        expect.any(Object)
      );
    });

    it('should handle errors gracefully', async () => {
      // Mock Date to throw an error
      const originalDate = Date;
      global.Date = jest.fn(() => {
        throw new Error('Mock error');
      }) as any;

      await expect(getTimeTool.execute({})).rejects.toThrow('Get current time error');
      
      expect(mockLogger.error).toHaveBeenCalled();
      
      // Restore Date
      global.Date = originalDate;
    });
  });
});
