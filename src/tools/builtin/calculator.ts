import { Logger } from '../../src/utils/logger';

/**
 * Calculator tool - performs mathematical calculations
 * WARNING: Uses eval() - only for trusted environments
 */
export class CalculatorTool {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Execute calculator tool
   * @param args - Arguments containing the expression to evaluate
   * @returns Calculation result
   */
  async execute(args: any): Promise<any> {
    const expression = args.expression;

    if (!expression || typeof expression !== 'string') {
      throw new Error('Expression is required and must be a string');
    }

    this.logger.info('Calculator tool executed', { expression });

    try {
      // SANITIZE: Only allow safe mathematical characters
      const sanitized = expression.replace(/[^0-9+\-*/().\s eE]/g, '');

      if (sanitized !== expression) {
        throw new Error('Expression contains invalid characters');
      }

      // WARNING: eval() can be dangerous in untrusted environments
      // For production, use a proper math parser like math.js
      const result = eval(sanitized);

      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid calculation result');
      }

      this.logger.info('Calculator tool result', { expression, result });

      return {
        expression,
        result,
        formatted: `${expression} = ${result}`
      };
    } catch (error: any) {
      this.logger.error('Calculator tool error', {
        expression,
        error: error.message
      });
      throw new Error(`Calculation error: ${error.message}`);
    }
  }
}
