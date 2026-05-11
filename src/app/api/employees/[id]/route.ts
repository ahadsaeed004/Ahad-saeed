import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { UpdateEmployeeSchema } from "@/lib/validations";
import {
  withAuth,
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/auth-middleware";

const COLLECTION = "employees";

type RouteContext = { params: { id: string } };

/**
 * GET /api/employees/:id
 */
export const GET = withAuth(async (_req: NextRequest, _ctx: { uid: string; email: string | undefined }, context?: RouteContext) => {
  const id = (context as RouteContext)?.params?.id;
  if (!id) return errorResponse("Missing employee ID", 400);

  const db = getAdminDb();
  const doc = await db.collection(COLLECTION).doc(id).get();

  if (!doc.exists) return errorResponse("Employee not found", 404);

  return successResponse({ id: doc.id, ...doc.data() });
});

/**
 * PUT /api/employees/:id
 */
export const PUT = withAuth(async (request: NextRequest, _ctx: { uid: string; email: string | undefined }, context?: RouteContext) => {
  const id = (context as RouteContext)?.params?.id;
  if (!id) return errorResponse("Missing employee ID", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = UpdateEmployeeSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten());

  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return errorResponse("Employee not found", 404);

  // Check code uniqueness if it's being changed
  if (
    parsed.data.employeeCode &&
    parsed.data.employeeCode !== existing.data()?.employeeCode
  ) {
    const dup = await db
      .collection(COLLECTION)
      .where("employeeCode", "==", parsed.data.employeeCode)
      .limit(1)
      .get();
    if (!dup.empty) {
      return errorResponse(`Employee code '${parsed.data.employeeCode}' already in use`, 409);
    }
  }

  await ref.update({ ...parsed.data, updatedAt: new Date().toISOString() });
  const updated = await ref.get();

  return successResponse({ id: updated.id, ...updated.data() });
});

/**
 * DELETE /api/employees/:id (soft delete)
 */
export const DELETE = withAuth(async (_req: NextRequest, _ctx: { uid: string; email: string | undefined }, context?: RouteContext) => {
  const id = (context as RouteContext)?.params?.id;
  if (!id) return errorResponse("Missing employee ID", 400);

  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();

  if (!existing.exists) return errorResponse("Employee not found", 404);

  // Soft delete — preserve attendance history
  await ref.update({
    isActive: false,
    updatedAt: new Date().toISOString(),
  });

  return successResponse({ id, deleted: true });
});
