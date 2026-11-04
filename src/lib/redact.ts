const TOKEN_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+\/-]+/gi,
  /(?:access[_ -]?token|token)\s*[:=]\s*["']?[^\s"']+/gi,
];

export function redact(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value ?? "");
  return TOKEN_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, "[redacted]"),
    text,
  );
}
