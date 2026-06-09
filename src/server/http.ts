import { NextResponse } from "next/server";

export class ApiInputError extends Error {
  status = 400;
}

function isGrpcError(error: unknown): error is {
  code: number;
  details?: string;
  message?: string;
} {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
  );
}

function grpcStatusToHttpStatus(code: number) {
  if (code === 3) {
    return 400;
  }

  if (code === 5) {
    return 404;
  }

  if (code === 7 || code === 16) {
    return 401;
  }

  if (code === 4) {
    return 504;
  }

  if (code === 14) {
    return 502;
  }

  return 500;
}

export function assertString(value: unknown, field: string) {
  if (typeof value !== "string") {
    throw new ApiInputError(`${field} is required`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ApiInputError(`${field} is required`);
  }

  return trimmed;
}

export function assertCellIndex(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 8
  ) {
    throw new ApiInputError("cellIndex must be between 0 and 8");
  }

  return value;
}

export function jsonError(error: unknown) {
  if (error instanceof ApiInputError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (isGrpcError(error)) {
    const message =
      typeof error.details === "string" && error.details
        ? error.details
        : "Backend request failed";

    return NextResponse.json(
      { error: message },
      { status: grpcStatusToHttpStatus(error.code) },
    );
  }

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}

export async function readJsonObject(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiInputError("Request body must be a JSON object");
  }

  return body as Record<string, unknown>;
}
