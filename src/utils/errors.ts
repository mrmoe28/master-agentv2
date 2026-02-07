/**
 * Error utilities: custom error classes and retry/timeout wrappers.
 */

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base error class with cause tracking and retryable flag.
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly retryable = false
  ) {
    super(message);
    this.name = 'AgentError';
    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Error from LLM API calls (OpenAI, Ollama, etc.).
 */
export class LLMError extends AgentError {
  constructor(
    message: string,
    cause?: Error,
    retryable = false,
    public readonly statusCode?: number
  ) {
    super(message, cause, retryable);
    this.name = 'LLMError';
  }

  static fromApiError(err: unknown): LLMError {
    if (err instanceof LLMError) return err;

    const error = err instanceof Error ? err : new Error(String(err));
    const message = error.message;

    // Check for retryable conditions
    const isRateLimit = message.includes('rate limit') || message.includes('429');
    const isTimeout = message.includes('timeout') || message.includes('ETIMEDOUT');
    const isNetworkError = message.includes('ECONNREFUSED') || message.includes('ENOTFOUND') || message.includes('network');
    const isServerError = message.includes('500') || message.includes('502') || message.includes('503');

    const retryable = isRateLimit || isTimeout || isNetworkError || isServerError;

    return new LLMError(
      `LLM API error: ${message}`,
      error,
      retryable
    );
  }
}

/**
 * Error parsing JSON from LLM response.
 */
export class LLMParseError extends LLMError {
  constructor(
    message: string,
    public readonly rawResponse: string,
    cause?: Error
  ) {
    super(message, cause, false);
    this.name = 'LLMParseError';
  }
}

/**
 * Error from BullMQ queue operations.
 */
export class QueueError extends AgentError {
  constructor(
    message: string,
    cause?: Error,
    public readonly operation?: string
  ) {
    super(message, cause, true); // Queue errors are typically retryable
    this.name = 'QueueError';
  }
}

/**
 * Error from external integrations (Google, Twilio, SendGrid).
 */
export class IntegrationError extends AgentError {
  constructor(
    message: string,
    public readonly provider: string,
    cause?: Error,
    retryable = false
  ) {
    super(message, cause, retryable);
    this.name = 'IntegrationError';
  }
}

/**
 * Error from embedding operations (Transformers.js).
 */
export class EmbeddingError extends AgentError {
  constructor(message: string, cause?: Error) {
    super(message, cause, true); // Embedding errors may be retryable (model loading)
    this.name = 'EmbeddingError';
  }
}

/**
 * Error from vector store operations (LanceDB).
 */
export class MemoryError extends AgentError {
  constructor(
    message: string,
    public readonly operation: string,
    cause?: Error
  ) {
    super(message, cause, true);
    this.name = 'MemoryError';
  }
}

/**
 * Error from planning operations.
 */
export class PlanningError extends AgentError {
  constructor(message: string, cause?: Error) {
    super(message, cause, true);
    this.name = 'PlanningError';
  }
}

/**
 * Error from evaluation operations.
 */
export class EvaluationError extends AgentError {
  constructor(message: string, cause?: Error) {
    super(message, cause, true);
    this.name = 'EvaluationError';
  }
}

/**
 * Timeout error.
 */
export class TimeoutError extends AgentError {
  constructor(
    message: string,
    public readonly timeoutMs: number
  ) {
    super(message, undefined, true);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// Retry Utility
// ============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Optional callback for logging retry attempts */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  /** Function to check if error is retryable (default: checks AgentError.retryable) */
  isRetryable?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'isRetryable'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with exponential backoff retry logic.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_RETRY_OPTIONS.maxRetries,
    initialDelayMs = DEFAULT_RETRY_OPTIONS.initialDelayMs,
    maxDelayMs = DEFAULT_RETRY_OPTIONS.maxDelayMs,
    backoffMultiplier = DEFAULT_RETRY_OPTIONS.backoffMultiplier,
    onRetry,
    isRetryable,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      // Check if we've exhausted retries
      if (attempt >= maxRetries) {
        break;
      }

      // Check if error is retryable
      const retryable = isRetryable
        ? isRetryable(error)
        : error instanceof AgentError
          ? error.retryable
          : false;

      if (!retryable) {
        break;
      }

      // Log retry attempt
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      // Wait before retry
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError ?? new Error('Unknown error in withRetry');
}

// ============================================================================
// Timeout Utility
// ============================================================================

/**
 * Execute a function with a timeout.
 * @throws TimeoutError if the operation exceeds the timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operationName = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(
        `${operationName} timed out after ${timeoutMs}ms`,
        timeoutMs
      ));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    return result;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

// ============================================================================
// Error Formatting Utilities
// ============================================================================

/**
 * Extract a user-friendly error message from an unknown error.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return String(err);
}

/**
 * Check if an error is likely retryable.
 */
export function isLikelyRetryable(err: unknown): boolean {
  if (err instanceof AgentError) {
    return err.retryable;
  }

  const message = getErrorMessage(err).toLowerCase();
  return (
    message.includes('rate limit') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('network') ||
    message.includes('429') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  );
}
