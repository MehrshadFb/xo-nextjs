"use client";

import { useEffect, useMemo, useState } from "react";
import {
  gameEventsUrl,
  getGameState,
  makeMove,
} from "@/lib/api";
import { GameBoard } from "@/components/game-board";
import { GameStatus } from "@/components/game-status";
import type { GameStreamEvent } from "@/lib/api";
import { previewGame } from "@/lib/game";
import type { GameState } from "@/lib/game";
import { readGameSession } from "@/lib/session";
import type { GameSession } from "@/lib/session";

type GameRoomProps = {
  roomCode: string;
};

function buildFallbackGame(
  roomCode: string,
  session: GameSession | null,
): GameState {
  const isPlayerX = session?.playerMark === "x";
  const isPlayerO = session?.playerMark === "o";

  return {
    ...previewGame,
    gameId: roomCode,
    joinCode: session?.joinCode ?? roomCode,
    playerX: {
      ...previewGame.playerX,
      displayName: isPlayerX
        ? session.displayName
        : previewGame.playerX.displayName,
    },
    playerO: {
      ...(previewGame.playerO ?? {
        displayName: "Player O",
        mark: "o" as const,
        role: "Opponent",
      }),
      displayName: isPlayerO
        ? session.displayName
        : (previewGame.playerO?.displayName ?? "Player O"),
    },
  };
}

export function GameRoom({ roomCode }: GameRoomProps) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [remoteGame, setRemoteGame] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [isLive, setIsLive] = useState(false);

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
  }, [roomCode, session]);

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
  }, [roomCode, session]);

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

  function statusMessage() {
    if (!session) {
      return "Create or join a game to play.";
    }

    if (!remoteGame && !isLive) {
      return "Connecting to game.";
    }

    if (game.status === "waiting") {
      return "Waiting for the second player.";
    }

    if (game.status !== "in_progress") {
      return "Game over.";
    }

    if (isMoving) {
      return "Saving move...";
    }

    return game.nextTurn === session.playerMark ? "Your turn." : "Opponent's turn.";
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
