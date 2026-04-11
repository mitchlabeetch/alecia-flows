type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEBUG_ENABLED = !IS_PRODUCTION;

function write(
  level: LogLevel,
  message: string,
  meta?: unknown,
  context?: LogContext
) {
  if (level === "debug" && !DEBUG_ENABLED) {
    return;
  }

  if (IS_PRODUCTION) {
    // Structured JSON output for log aggregators (e.g. Vercel, Datadog)
    const entry: Record<string, unknown> = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };
    if (context && Object.keys(context).length > 0) {
      Object.assign(entry, context);
    }
    if (meta !== undefined) {
      entry.meta = meta;
    }
    // biome-ignore lint/suspicious/noConsole: structured production logging
    console[level === "debug" ? "debug" : level](JSON.stringify(entry));
    return;
  }

  // Development: readable format
  const method =
    level === "debug" ? console.debug : console[level].bind(console);

  const prefix = context?.correlationId ? `[${context.correlationId}] ` : "";

  if (meta === undefined && (!context || Object.keys(context).length === 0)) {
    method(`${prefix}${message}`);
    return;
  }

  const extras =
    context && Object.keys(context).length > 0
      ? { ...context, ...(meta !== undefined ? { meta } : {}) }
      : meta;
  method(`${prefix}${message}`, extras);
}

export const logger = {
  debug(message: string, meta?: unknown, context?: LogContext) {
    write("debug", message, meta, context);
  },
  info(message: string, meta?: unknown, context?: LogContext) {
    write("info", message, meta, context);
  },
  warn(message: string, meta?: unknown, context?: LogContext) {
    write("warn", message, meta, context);
  },
  error(message: string, meta?: unknown, context?: LogContext) {
    write("error", message, meta, context);
  },
  /**
   * Create a child logger bound to a fixed context (e.g. correlationId, requestId).
   * All messages emitted by the child automatically include the context fields.
   *
   * @example
   * const log = logger.withContext({ correlationId: req.headers.get("x-request-id") ?? crypto.randomUUID() });
   * log.info("Request received");
   */
  withContext(context: LogContext) {
    return {
      debug(message: string, meta?: unknown) {
        write("debug", message, meta, context);
      },
      info(message: string, meta?: unknown) {
        write("info", message, meta, context);
      },
      warn(message: string, meta?: unknown) {
        write("warn", message, meta, context);
      },
      error(message: string, meta?: unknown) {
        write("error", message, meta, context);
      },
    };
  },
};
