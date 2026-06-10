import { NextRequest } from "next/server";
import type { GameStreamEvent } from "@/lib/game";
import { ApiInputError, assertString, jsonError } from "@/server/http";
import { watchGame } from "@/server/xo/grpc-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    gameId: string;
  }>;
};

function parseAfterVersion(request: NextRequest) {
  const rawVersion =
    request.nextUrl.searchParams.get("afterVersion") ??
    request.headers.get("Last-Event-ID") ??
    "0";
  const afterVersion = Number(rawVersion);

  if (!Number.isInteger(afterVersion) || afterVersion < 0) {
    throw new ApiInputError("afterVersion must be a non-negative integer");
  }

  return afterVersion;
}

function formatSseEvent(
  eventName: string,
  payload: GameStreamEvent | { error: string },
  eventId?: number,
) {
  const idLine = eventId === undefined ? "" : `id: ${eventId}\n`;

  return `${idLine}event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { gameId } = await params;
    const playerToken = assertString(
      request.nextUrl.searchParams.get("playerToken"),
      "playerToken",
    );
    const afterVersion = parseAfterVersion(request);
    const encoder = new TextEncoder();
    let cancelWatch = () => {};

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let isClosed = false;

        function close() {
          if (isClosed) {
            return;
          }

          isClosed = true;
          controller.close();
        }

        function send(
          eventName: string,
          payload: GameStreamEvent | { error: string },
          eventId?: number,
        ) {
          if (isClosed) {
            return;
          }

          controller.enqueue(
            encoder.encode(formatSseEvent(eventName, payload, eventId)),
          );
        }

        cancelWatch = watchGame({
          gameId,
          playerToken,
          afterVersion,
          onEvent: (event) => send("game", event, event.eventId),
          onError: (error) => {
            send("stream-error", {
              error: error.message || "Realtime stream failed",
            });
            close();
          },
          onEnd: close,
        });

        request.signal.addEventListener(
          "abort",
          () => {
            cancelWatch();
            close();
          },
          { once: true },
        );
      },
      cancel() {
        cancelWatch();
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
