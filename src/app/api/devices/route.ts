import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { CreateDeviceSchema } from "@/lib/validations";
import {
  withAuth,
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/auth-middleware";

const COLLECTION = "devices";

export const GET = withAuth(async () => {
  try {
    const db = getAdminDb();
    const snap = await db.collection(COLLECTION).orderBy("name", "asc").get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return successResponse(data);
  } catch (err) {
    console.error("[GET /api/devices]", err);
    return errorResponse("Failed to fetch devices", 500);
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = CreateDeviceSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten());

  const now = new Date().toISOString();
  const db = getAdminDb();

  const docRef = await db.collection(COLLECTION).add({
    ...parsed.data,
    status: "offline",
    lastSync: null,
    createdAt: now,
    updatedAt: now,
  });

  const created = await docRef.get();
  return successResponse({ id: created.id, ...created.data() }, 201);
});
