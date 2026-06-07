import { NextResponse } from "next/server";
import { assertString, jsonError, readJsonObject } from "@/server/http";
import { joinGame } from "@/server/xo/mock-client";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const joinCode = assertString(body.joinCode, "joinCode");
    const displayName = assertString(body.displayName, "displayName");
    const result = await joinGame(joinCode, displayName);

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
