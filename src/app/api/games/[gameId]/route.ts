import { NextRequest, NextResponse } from "next/server";
import { assertString, jsonError } from "@/server/http";
import { getState } from "@/server/xo/mock-client";

type RouteContext = {
  params: Promise<{
    gameId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { gameId } = await params;
    const playerToken = assertString(
      request.nextUrl.searchParams.get("playerToken"),
      "playerToken",
    );
    const state = await getState(gameId, playerToken);

    return NextResponse.json({ state });
  } catch (error) {
    return jsonError(error);
  }
}
