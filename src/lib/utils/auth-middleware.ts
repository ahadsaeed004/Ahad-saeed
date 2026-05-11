import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import type { ApiResponse } from "@/types";

/**
 * Verifies Firebase ID token from Authorization header.
 * Returns the decoded token or throws an error.
 */
export async function verifyAuthToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or malformed Authorization header", 401);
  }

  const token = authHeader.slice(7);

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded;
  } catch {
    throw new AuthError("Invalid or expired token", 401);
  }
}

/**
 * Verifies the device push secret for machine-to-machine calls.
 * Used by biometric devices / bridge services pushing data.
 */
export function verifyDeviceSecret(secret: string | undefined): boolean {
  const expected = process.env.API_SECRET_KEY;
  if (!expected) {
    console.warn("API_SECRET_KEY not set — device push authentication disabled");
    return false;
  }
  return secret === expected;
}

/**
 * Higher-order wrapper that adds authentication to a route handler.
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: { uid: string; email: string | undefined }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const decoded = await verifyAuthToken(request);
      return handler(request, {
        uid: decoded.uid,
        email: decoded.email,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        return errorResponse(err.message, err.statusCode);
      }
      return errorResponse("Authentication failed", 401);
    }
  };
}

/**
 * Wrapper for routes that accept EITHER a user JWT OR the device secret.
 * Useful for /api/attendance/import which can be called by devices OR admins.
 */
export function withAuthOrSecret(
  handler: (
    request: NextRequest,
    context: { uid?: string; isDevice: boolean }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Try device secret first (no DB call needed — fast path for high-frequency device pushes)
    const body = await request.clone().json().catch(() => null);
    if (body?.secret && verifyDeviceSecret(body.secret)) {
      return handler(request, { isDevice: true });
    }

    // Fall back to JWT auth
    try {
      const decoded = await verifyAuthToken(request);
      return handler(request, { uid: decoded.uid, isDevice: false });
    } catch {
      return errorResponse("Unauthorized: provide a valid Bearer token or device secret", 401);
    }
  };
}

// ─── Error Classes ────────────────────────────────────────────────────────────
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ─── Response Helpers ─────────────────────────────────────────────────────────
export function successResponse<T>(data: T, status = 200): NextResponse {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

export function errorResponse(
  message: string,
  status = 500,
  details?: unknown
): NextResponse {
  const body: ApiResponse = {
    success: false,
    error: message,
    ...(details ? { data: details } : {}),
  };
  return NextResponse.json(body, { status });
}

export function validationErrorResponse(errors: unknown): NextResponse {
  return errorResponse("Validation failed", 422, errors);
}
