/**
 * Consistent API Error Handling
 *
 * Standard error response format:
 *   { "success": false, "error": "mensaje", "code": "ERROR_CODE", "status": 400 }
 *
 * Uso en routes:
 *   throwApiError(res, 400, "Mensaje", "VALIDATION_ERROR")
 *   throwApiError(res, 401, "Token inválido", "TOKEN_EXPIRED")
 *
 * O desde un catch:
 *   catch (e) { return handleApiError(res, e); }
 */

import { type Response } from "express";

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  status: number;
}

const ERROR_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "AUTH_ERROR",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
};

/**
 * Builds a consistent API error response object.
 */
export function buildApiError(
  status: number,
  message: string,
  code?: string
): ApiErrorResponse {
  return {
    success: false,
    error: message,
    code: code || ERROR_CODES[status] || "UNKNOWN_ERROR",
    status,
  };
}

/**
 * Sends a consistent API error response.
 */
export function throwApiError(
  res: Response,
  status: number,
  message: string,
  code?: string
): Response {
  return res.status(status).json(buildApiError(status, message, code));
}

/**
 * Maneja errores no esperados (try/catch) sin exponer stack traces.
 */
export function handleApiError(res: Response, error: unknown): Response {
  if (error && typeof error === "object" && "status" in error && "message" in error) {
    const e = error as { status: number; message: string; code?: string };
    return throwApiError(res, e.status, e.message, e.code);
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  console.error(`[API ERROR] ${message}`);
  return throwApiError(res, 500, "Internal server error");
}
