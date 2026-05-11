import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { CreateEmployeeSchema } from "@/lib/validations";
import {
  withAuth,
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/auth-middleware";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTION = "employees";

/**
 * GET /api/employees
 * Returns all active employees.
 */
export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(COLLECTION)
      .where("isActive", "==", true)
      .orderBy("name", "asc")
      .get();

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return successResponse(data);
  } catch (err) {
    console.error("[GET /api/employees]", err);
    return errorResponse("Failed to fetch employees", 500);
  }
});

/**
 * POST /api/employees
 * Creates a new employee.
 */
export const POST = withAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = CreateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten());
  }

  const db = getAdminDb();

  // Check for duplicate employeeCode
  const existing = await db
    .collection(COLLECTION)
    .where("employeeCode", "==", parsed.data.employeeCode)
    .limit(1)
    .get();

  if (!existing.empty) {
    return errorResponse(
      `Employee code '${parsed.data.employeeCode}' already exists`,
      409
    );
  }

  const now = new Date().toISOString();
  const docRef = await db.collection(COLLECTION).add({
    ...parsed.data,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const created = await docRef.get();
  return successResponse({ id: created.id, ...created.data() }, 201);
});
