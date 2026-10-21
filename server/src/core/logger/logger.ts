type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

const formatMessage = (
  level: LogLevel,
  message: string,
  meta?: unknown,
): string => {
  const timestamp = new Date().toISOString();
  const header = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;

  if (meta === undefined) return header;

  const json = JSON.stringify(
    meta,
    (_key, value) => {
      // Error properties are normally omitted by JSON.stringify.
      if (value instanceof Error) {
        const extended = value as Error & { code?: unknown; detail?: unknown; cause?: unknown; errors?: unknown[] };
        return {
          name: value.name,
          message: value.message,
          ...(extended.code ? { code: extended.code } : {}),
          ...(extended.detail ? { detail: extended.detail } : {}),
          ...(extended.cause ? { cause: extended.cause } : {}),
          ...(extended.errors ? { errors: extended.errors } : {}),
          stack: value.stack,
        };
      }

      // JSON does not support BigInt directly.
      return typeof value === 'bigint' ? value.toString() : value;
    },
    2,
  );

  return `${header}\n${json}`;
};

const logger = {
  info: (message: string, meta?: unknown) => {
    console.log(formatMessage('info', message, meta));
  },
  warn: (message: string, meta?: unknown) => {
    console.warn(formatMessage('warn', message, meta));
  },
  error: (message: string, meta?: unknown) => {
    console.error(formatMessage('error', message, meta));
  },
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, meta));
    }
  },
  success: (message: string, meta?: unknown) => {
    console.log(formatMessage('success', message, meta));
  },
};

export default logger;
