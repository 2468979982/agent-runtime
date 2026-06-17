// Export all built-in tools
export { CalculatorTool } from './calculator';
export { GetCurrentTimeTool } from './get-current-time';

// Tool factory function
import { CalculatorTool } from './calculator';
import { GetCurrentTimeTool } from './get-current-time';
import { Logger } from '../../src/utils/logger';

export function registerBuiltinTools(toolManager: any, logger?: Logger): void {
  const log = logger || new Logger();
  
  // Register calculator tool
  const calculator = new CalculatorTool(log);
  toolManager.registerBuiltinTool('calculator', async (args: any) => {
    return await calculator.execute(args);
  });
  
  // Register get_current_time tool
  const getTime = new GetCurrentTimeTool(log);
  toolManager.registerBuiltinTool('get_current_time', async (args: any) => {
    return await getTime.execute(args);
  });
  
  log.info('Built-in tools registered', {
    tools: ['calculator', 'get_current_time']
  });
}
