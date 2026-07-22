const REDACTED = "[REDACTED]";

export function safeErrorDetails(error) {
  const details = {
    name: error instanceof Error ? error.name : "Error",
    message: redactSensitiveText(error instanceof Error ? error.message : String(error))
  };

  const code = scalarValue(error?.code);
  if (code !== null) {
    details.code = code;
  }

  const statusCode = scalarValue(error?.statusCode ?? error?.meta?.statusCode);
  if (statusCode !== null) {
    details.status_code = statusCode;
  }

  return details;
}

export function logFatalError(logger, context, error) {
  logger.error(`${context}: ${JSON.stringify(safeErrorDetails(error))}`);
}

export function redactSensitiveText(value) {
  return String(value)
    .replace(/\b(https?:\/\/)[^\s/@]+@/gi, `$1${REDACTED}@`)
    .replace(
      /(authorization\s*["']?\s*[:=]\s*["']?)(?:(?:Basic|Bearer)\s+)?[^\s,"'}]+/gi,
      `$1${REDACTED}`
    )
    .replace(
      /((?:password|passwd|secret|token)\s*["']?\s*[:=]\s*["']?)([^\s,"'}]+)/gi,
      `$1${REDACTED}`
    )
    .replace(/\b(Basic|Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, `$1 ${REDACTED}`);
}

function scalarValue(value) {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  return null;
}
