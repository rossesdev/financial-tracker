/**
 * Simple logger utility.
 * In development: logs to console with a prefix.
 * In production: no-op to avoid leaking financial data.
 */

const logger = {
  info(message: string, data?: unknown): void {
    if (__DEV__) {
      console.log(`[LOG] ${message}`, data !== undefined ? data : '');
    }
  },

  warn(message: string, data?: unknown): void {
    if (__DEV__) {
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
    }
  },

  error(message: string, data?: unknown): void {
    if (__DEV__) {
      console.error(`[ERROR] ${message}`, data !== undefined ? data : '');
    }
  },
};

export default logger;
