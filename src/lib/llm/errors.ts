/**
 * LLMError — pure class with no server-side dependencies.
 * Kept in its own file so it can be imported from client code for error
 * handling (e.g., typed error boundaries) without pulling in `server-only`.
 */

export type LLMErrorType =
  | "rate_limit"
  | "auth"
  | "network"
  | "parse"
  | "server"
  | "unknown";

export class LLMError extends Error {
  readonly provider: string;
  readonly type: LLMErrorType;
  readonly status?: number;

  constructor(
    provider: string,
    type: LLMErrorType,
    message: string,
    status?: number
  ) {
    // Message intentionally does NOT include user input or LLM response content.
    super(message);
    this.name = "LLMError";
    this.provider = provider;
    this.type = type;
    this.status = status;
  }
}
