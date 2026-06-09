"use client";

import { useEffect, useMemo, useState } from "react";
import { getGameState } from "@/lib/api";
import { GameBoard } from "@/components/game-board";
import { GameStatus } from "@/components/game-status";
import { GameState, previewGame } from "@/lib/game";
import { GameSession, readGameSession } from "@/lib/session";

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

  const game = useMemo(
    () => remoteGame ?? buildFallbackGame(roomCode, session),
    [remoteGame, roomCode, session],
  );

  return (
    <section className="mx-auto grid w-full max-w-2xl gap-5">
      <GameStatus game={game} session={session} />
      {error ? (
        <p className="wood-panel rounded-xl p-4 text-sm font-black text-[#8b2f1f]">
          {error}
        </p>
      ) : null}
      <GameBoard board={game.board} />
    </section>
  );
}
