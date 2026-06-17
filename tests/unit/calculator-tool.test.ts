import { CalculatorTool } from '../../src/tools/builtin/calculator';
import { GetCurrentTimeTool } from '../../src/tools/builtin/get-current-time';
import { Logger } from '../../src/utils/logger';

describe('CalculatorTool', () => {
  let calculator: CalculatorTool;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    calculator = new CalculatorTool(mockLogger);
  });

  describe('execute', () => {
    it('should perform basic arithmetic', async () => {
      const result = await calculator.execute({ expression: '2 + 3' });
      expect(result.result).toBe(5);
      expect(result.expression).toBe('2 + 3');
      expect(result.formatted).toBe('2 + 3 = 5');
    });

    it('should handle multiplication', async () => {
      const result = await calculator.execute({ expression: '4 * 5' });
      expect(result.result).toBe(20);
    });

    it('should handle division', async () => {
      const result = await calculator.execute({ expression: '10 / 2' });
      expect(result.result).toBe(5);
    });

    it('should handle parentheses', async () => {
      const result = await calculator.execute({ expression: '(2 + 3) * 4' });
      expect(result.result).toBe(20);
    });

    it('should handle decimal numbers', async () => {
      const result = await calculator.execute({ expression: '3.14 * 2' });
      expect(result.result).toBeCloseTo(6.28);
    });

    it('should handle scientific notation', async () => {
      const result = await calculator.execute({ expression: '1e3 + 2e2' });
      expect(result.result).toBe(1200);
    });

    it('should reject expressions with invalid characters', async () => {
      await expect(calculator.execute({ expression: '2 + x' })).rejects.toThrow('invalid characters');
    });

    it('should reject expressions with dangerous characters', async () => {
      await expect(calculator.execute({ expression: 'process.exit()' })).rejects.toThrow('invalid characters');
    });

    it('should handle missing expression', async () => {
      await expect(calculator.execute({})).rejects.toThrow('required and must be a string');
    });

    it('should handle non-string expression', async () => {
      await expect(calculator.execute({ expression: 123 })).rejects.toThrow('required and must be a string');
    });

    it('should handle invalid calculation result', async () => {
      await expect(calculator.execute({ expression: '1/0' })).rejects.toThrow('Invalid calculation result');
    });

    it('should log info on successful execution', async () => {
      await calculator.execute({ expression: '2 + 2' });
      expect(mockLogger.info).toHaveBeenCalledWith('Calculator tool executed', { expression: '2 + 2' });
    });

    it('should log error on failure', async () => {
      try {
        await calculator.execute({ expression: 'invalid' });
      } catch (error) {
        // Expected error
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
