import { NextResponse } from "next/server";
import { assertString, jsonError, readJsonObject } from "@/server/http";
import { requestRematch } from "@/server/xo/grpc-client";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    gameId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { gameId } = await params;
    const body = await readJsonObject(request);
    const playerToken = assertString(body.playerToken, "playerToken");
    const state = await requestRematch(gameId, playerToken);

    return NextResponse.json({ state });
  } catch (error) {
    return jsonError(error);
  }
}
