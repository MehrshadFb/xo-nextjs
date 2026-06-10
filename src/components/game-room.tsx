"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  gameEventsUrl,
  getGameState,
  makeMove,
} from "@/lib/api";
import { GameBoard } from "@/components/game-board";
import { GameStatus } from "@/components/game-status";
import type { GameStreamEvent } from "@/lib/api";
import { markLabel } from "@/lib/game";
import type { GameState, Mark } from "@/lib/game";
import { clearGameSession, readGameSession } from "@/lib/session";
import type { GameSession } from "@/lib/session";

type GameRoomProps = {
  roomCode: string;
};

const emptyBoard = Array.from({ length: 9 }, () => "empty") as Mark[];

function buildFallbackGame(
  roomCode: string,
  session: GameSession | null | undefined,
): GameState {
  const isPlayerX = session?.playerMark === "x";
  const isPlayerO = session?.playerMark === "o";

  return {
    gameId: roomCode,
    joinCode: session?.joinCode ?? roomCode,
    status: "waiting",
    board: emptyBoard,
    playerX: {
      displayName: isPlayerX ? session.displayName : "Player X",
      mark: "x",
      role: "Host",
    },
    playerO: isPlayerO
      ? {
          displayName: session.displayName,
          mark: "o",
          role: "Opponent",
        }
      : null,
    nextTurn: "x",
    winner: "empty",
    isDraw: false,
    version: 0,
  };
}

function outcomeMessage(game: GameState, session: GameSession | null) {
  if (game.isDraw) {
    return "Draw game.";
  }

  if (game.winner === "empty") {
    return "Game over.";
  }

  if (!session) {
    return `${markLabel(game.winner)} wins.`;
  }

  return game.winner === session.playerMark ? "You won." : "You lost.";
}

function RoomNotice({
  title,
  message,
  actionLabel = "Back to lobby",
  actionHref = "/",
  onAction,
  secondaryLabel,
  secondaryHref = "/",
  onSecondaryAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string | null;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondaryAction?: () => void;
}) {
  const actionClass =
    "inline-grid h-12 place-items-center rounded-lg border-2 border-[#5f351c] bg-[#5f351c] px-5 text-base font-black text-[#fff6df] transition hover:bg-[#4c2915]";

  return (
    <section className="mx-auto grid w-full max-w-md gap-4">
      <div className="wood-panel rounded-xl p-5 text-center sm:p-6">
        <p className="text-sm font-black uppercase text-[#1f7a71]">Room</p>
        <h1 className="mt-1 break-all font-mono text-3xl font-black text-[#5f351c]">
          {title}
        </h1>
        <p className="mt-4 text-sm font-black text-[#5f351c]">{message}</p>
        <div className="mt-5 flex flex-col items-center gap-3">
          {actionHref ? (
            <Link href={actionHref} onClick={onAction} className={actionClass}>
              {actionLabel}
            </Link>
          ) : (
            <button type="button" onClick={onAction} className={actionClass}>
              {actionLabel}
            </button>
          )}
          {secondaryLabel ? (
            <Link
              href={secondaryHref}
              onClick={onSecondaryAction}
              className="text-sm font-black text-[#5f351c] underline decoration-[#5f351c]/40 decoration-2 underline-offset-4"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function GameRoom({ roomCode }: GameRoomProps) {
  const [session, setSession] = useState<GameSession | null>();
  const [remoteGame, setRemoteGame] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setSession(readGameSession(roomCode));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [roomCode]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isCurrent = true;

    getGameState(roomCode, session.playerToken)
      .then(({ state }) => {
        if (isCurrent) {
          setRemoteGame(state);
          setError("");
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load game.",
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [roomCode, retryCount, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const source = new EventSource(
      gameEventsUrl(roomCode, session.playerToken),
    );

    function handleOpen() {
      setIsLive(true);
    }

    function handleGameEvent(event: MessageEvent<string>) {
      let payload: GameStreamEvent;

      try {
        payload = JSON.parse(event.data) as GameStreamEvent;
      } catch {
        setError("Unable to read realtime update.");
        setIsLive(false);
        return;
      }

      setRemoteGame(payload.state);
      setError("");
      setIsLive(true);
    }

    function handleStreamError(event: MessageEvent<string>) {
      let payload: { error?: string };

      try {
        payload = JSON.parse(event.data) as { error?: string };
      } catch {
        payload = {};
      }

      setError(payload.error ?? "Realtime stream failed.");
      setIsLive(false);
      source.close();
    }

    function handleConnectionError() {
      setIsLive(false);
    }

    source.addEventListener("open", handleOpen);
    source.addEventListener("game", handleGameEvent);
    source.addEventListener("stream-error", handleStreamError);
    source.addEventListener("error", handleConnectionError);

    return () => {
      source.removeEventListener("open", handleOpen);
      source.removeEventListener("game", handleGameEvent);
      source.removeEventListener("stream-error", handleStreamError);
      source.removeEventListener("error", handleConnectionError);
      source.close();
      setIsLive(false);
    };
  }, [roomCode, retryCount, session]);

  const game = useMemo(
    () => remoteGame ?? buildFallbackGame(roomCode, session),
    [remoteGame, roomCode, session],
  );
  const canMove =
    Boolean(session) &&
    game.status === "in_progress" &&
    game.nextTurn === session?.playerMark &&
    !isMoving;

  async function handleMove(cellIndex: number) {
    if (!session || !canMove || game.board[cellIndex] !== "empty") {
      return;
    }

    setIsMoving(true);
    setError("");

    try {
      const { state } = await makeMove(game.gameId, session.playerToken, cellIndex);
      setRemoteGame(state);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to make move.",
      );
    } finally {
      setIsMoving(false);
    }
  }

  function handleRetry() {
    setRemoteGame(null);
    setError("");
    setIsLive(false);
    setRetryCount((current) => current + 1);
  }

  function statusMessage() {
    if (session === undefined) {
      return "Loading game.";
    }

    if (!session) {
      return "Create or join a game to play.";
    }

    if (!remoteGame) {
      return "Connecting to game.";
    }

    if (game.status === "waiting") {
      return "Waiting for the second player.";
    }

    if (game.status === "finished") {
      return outcomeMessage(game, session);
    }

    if (game.status === "aborted") {
      return "Game ended.";
    }

    if (isMoving) {
      return "Saving move...";
    }

    if (!isLive) {
      return "Reconnecting.";
    }

    return game.nextTurn === session.playerMark ? "Your turn." : "Opponent's turn.";
  }

  if (session === undefined) {
    return (
      <RoomNotice
        title={roomCode}
        message="Loading game."
        actionLabel="Back to lobby"
      />
    );
  }

  if (session === null) {
    return (
      <RoomNotice
        title={roomCode}
        message="Create or join a game first."
        onAction={clearGameSession}
      />
    );
  }

  if (error && !remoteGame) {
    return (
      <RoomNotice
        title="Game unavailable"
        message={error}
        actionLabel="Try again"
        actionHref={null}
        onAction={handleRetry}
        secondaryLabel="Back to lobby"
        onSecondaryAction={clearGameSession}
      />
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-2xl gap-5">
      <GameStatus game={game} session={session} />
      <p className="text-center text-sm font-black text-[#5f351c]">
        {statusMessage()}
      </p>
      {error ? (
        <p className="wood-panel rounded-xl p-4 text-sm font-black text-[#8b2f1f]">
          {error}
        </p>
      ) : null}
      <GameBoard
        board={game.board}
        canMove={canMove}
        isMoving={isMoving}
        onMove={handleMove}
      />
    </section>
  );
}
