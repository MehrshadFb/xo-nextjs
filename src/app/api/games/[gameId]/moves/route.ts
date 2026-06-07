import { NextResponse } from "next/server";
import {
  assertCellIndex,
  assertString,
  jsonError,
  readJsonObject,
} from "@/server/http";
import { makeMove } from "@/server/xo/mock-client";

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
    const cellIndex = assertCellIndex(body.cellIndex);
    const state = await makeMove(gameId, playerToken, cellIndex);

    return NextResponse.json({ state });
  } catch (error) {
    return jsonError(error);
  }
}
