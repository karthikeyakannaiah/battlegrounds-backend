// logger.ts

/**
 * Safely converts an object to a JSON string.
 * It handles circular references and special cases (like BigInt).
 *
 * @param obj - The object to stringify.
 * @param indent - The number of spaces used for indentation (default is 2).
 * @returns A JSON string representing the object.
 */
export function safeStringify(obj: unknown, indent: number = 2): string {
    const seen = new WeakSet();
  
    return JSON.stringify(obj, (key, value) => {
      // Convert BigInt values to string
      if (typeof value === 'bigint') {
        return value.toString();
      }
  
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
  
      return value;
    }, indent);
  }
  
  /**
   * Logs one or more messages by serializing them into JSON format.
   * It automatically adds a timestamp to the log entry.
   * If serialization fails, it falls back to a simple error message.
   *
   * @param messages - One or more messages or data items to log.
   */
  export function logger(...messages: unknown[]): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      messages: messages,
    };
  
    let output: string;
    try {
      output = safeStringify(logEntry);
    } catch (err) {
      // Fallback in case safeStringify fails
      output = JSON.stringify({
        timestamp: new Date().toISOString(),
        error: 'Failed to serialize log entry',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  
    console.log(output);
  }
  