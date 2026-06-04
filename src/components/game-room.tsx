"use client";

import { useMemo, useSyncExternalStore } from "react";
import { GameBoard } from "@/components/game-board";
import { GameStatus } from "@/components/game-status";
import { GameState, previewGame } from "@/lib/game";
import { GameSession, readGameSession } from "@/lib/session";

type GameRoomProps = {
  roomCode: string;
};

function subscribeGameSession(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => window.removeEventListener("storage", onStoreChange);
}

function buildGame(roomCode: string, session: GameSession | null): GameState {
  const isPlayerX = session?.playerMark === "x";
  const isPlayerO = session?.playerMark === "o";

  return {
    ...previewGame,
    gameId: roomCode,
    joinCode: roomCode,
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
  const session = useSyncExternalStore(
    subscribeGameSession,
    () => readGameSession(roomCode),
    () => null,
  );

  const game = useMemo(() => buildGame(roomCode, session), [roomCode, session]);

  return (
    <section className="mx-auto grid w-full max-w-2xl gap-5">
      <GameStatus game={game} session={session} />
      <GameBoard board={game.board} />
    </section>
  );
}
