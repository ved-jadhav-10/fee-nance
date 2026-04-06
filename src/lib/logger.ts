type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerMetadata {
  [key: string]: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLogLevel =
  (process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel) {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLogLevel];
}

function toErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

function writeLog(level: LogLevel, message: string, metadata?: LoggerMetadata, error?: unknown) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    metadata: metadata ?? null,
    error: error ? toErrorPayload(error) : null,
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  if (level === "info") {
    console.info(serialized);
    return;
  }

  console.debug(serialized);
}

export const logger = {
  debug(message: string, metadata?: LoggerMetadata) {
    writeLog("debug", message, metadata);
  },
  info(message: string, metadata?: LoggerMetadata) {
    writeLog("info", message, metadata);
  },
  warn(message: string, metadata?: LoggerMetadata) {
    writeLog("warn", message, metadata);
  },
  error(message: string, error?: unknown, metadata?: LoggerMetadata) {
    writeLog("error", message, metadata, error);
  },
};
