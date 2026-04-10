type LogLevel = "debug" | "info" | "warn" | "error";

const DEBUG_ENABLED = process.env.NODE_ENV !== "production";

function write(level: LogLevel, message: string, meta?: unknown) {
  if (level === "debug" && !DEBUG_ENABLED) {
    return;
  }

  const method =
    level === "debug" ? console.debug : console[level].bind(console);

  if (meta === undefined) {
    method(message);
    return;
  }

  method(message, meta);
}

export const logger = {
  debug(message: string, meta?: unknown) {
    write("debug", message, meta);
  },
  info(message: string, meta?: unknown) {
    write("info", message, meta);
  },
  warn(message: string, meta?: unknown) {
    write("warn", message, meta);
  },
  error(message: string, meta?: unknown) {
    write("error", message, meta);
  },
};
