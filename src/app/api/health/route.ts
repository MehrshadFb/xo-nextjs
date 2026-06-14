import { NextResponse } from "next/server";
import { getHealth } from "@/server/xo/grpc-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backend = await getHealth();

    if (backend.status !== "serving") {
      return NextResponse.json(
        {
          status: "error",
          backend: backend.status,
          message: backend.message || "Backend is not serving",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      backend: backend.status,
      message: backend.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        backend: "unavailable",
        message:
          error instanceof Error ? error.message : "Backend health check failed",
      },
      { status: 503 },
    );
  }
}
