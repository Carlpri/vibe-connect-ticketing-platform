/**
 * Secure server-side logger that prevents sensitive data leakage (passwords, tokens, credentials).
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  category?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  [key: string]: any;
}

// Keys that must NEVER be printed in logs
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'database_url',
  'direct_url',
]);

/**
 * Recursively redacts sensitive keys from objects before logging
 */
export const sanitizeForLogging = (obj: any, depth = 0): any => {
  if (depth > 4 || obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Redact potential connection strings containing passwords
    return obj.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1[REDACTED]$3');
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        clean[key] = '[REDACTED]';
      } else {
        clean[key] = sanitizeForLogging(value, depth + 1);
      }
    }
    return clean;
  }

  return obj;
};

export const logger = {
  error: (message: string, error?: any, context: LogContext = {}) => {
    const timestamp = new Date().toISOString();
    const isProd = process.env.NODE_ENV === 'production';

    const logEntry = {
      timestamp,
      level: 'error',
      category: context.category || 'APPLICATION_ERROR',
      method: context.method,
      path: context.path,
      statusCode: context.statusCode || 500,
      message,
      ...(error?.code ? { errorCode: error.code } : {}),
      ...(error?.name ? { errorName: error.name } : {}),
      ...(!isProd && error?.stack ? { stack: error.stack } : {}),
      ...sanitizeForLogging(context),
    };

    if (isProd) {
      console.error(JSON.stringify(logEntry));
    } else {
      console.error(
        `\n🔴 [${timestamp}] [${logEntry.category}] ${context.method || ''} ${context.path || ''} -> HTTP ${logEntry.statusCode}`
      );
      console.error(`   Message: ${message}`);
      if (error?.code) console.error(`   Code: ${error.code}`);
      if (error?.stack) console.error(`   Stack:\n${error.stack}`);
    }
  },

  warn: (message: string, context: LogContext = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`⚠️ [${timestamp}] [${context.category || 'WARN'}] ${message}`, sanitizeForLogging(context));
  },

  info: (message: string, context: LogContext = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`ℹ️ [${timestamp}] [${context.category || 'INFO'}] ${message}`, sanitizeForLogging(context));
  },
};
