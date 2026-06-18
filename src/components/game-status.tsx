"use client";

import Link from "next/link";
import { useState } from "react";
import { GameState, markLabel, statusLabel } from "@/lib/game";
import { clearGameSession, GameSession } from "@/lib/session";

type GameStatusProps = {
  game: GameState;
  session: GameSession | null;
};

function turnMetric(game: GameState) {
  if (game.status === "finished") {
    return {
      label: "Winner",
      value: game.isDraw ? "Draw" : markLabel(game.winner) || "Done",
    };
  }

  if (game.status === "aborted") {
    return {
      label: "Outcome",
      value: "Ended",
    };
  }

  return {
    label: "Next turn",
    value: markLabel(game.nextTurn),
  };
}

export function GameStatus({ game, session }: GameStatusProps) {
  const metric = turnMetric(game);
  const playerOName = game.playerO?.displayName ?? "Waiting";
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(game.joinCode);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2200);
    }
  }

  return (
    <section className="wood-panel rounded-xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-[#1f7a71]">Room</p>
          <h1 className="mt-1 break-all font-mono text-3xl font-black text-[#5f351c]">
            {game.joinCode}
          </h1>
          <p className="mt-1 text-sm font-black text-[#5f351c]/80">
            {session
              ? `You: ${session.displayName} (${markLabel(session.playerMark)})`
              : "Preview"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyRoomCode}
            className="rounded-lg border-2 border-[#5f351c]/35 bg-[#fff6df] px-4 py-2 text-sm font-black text-[#5f351c] transition hover:border-[#5f351c]"
          >
            {copyState === "copied"
              ? "Copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy code"}
          </button>
          <Link
            href="/"
            onClick={clearGameSession}
            className="rounded-lg border-2 border-[#5f351c]/35 bg-[#fff6df] px-4 py-2 text-sm font-black text-[#5f351c] transition hover:border-[#5f351c]"
          >
            New game
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t-2 border-[#5f351c]/20 pt-4">
        <dl className="grid gap-3 text-sm text-[#5f351c] sm:grid-cols-3">
          <div className="min-w-0">
            <dt>Status</dt>
            <dd className="mt-1 font-black text-[#24160d]">
              {statusLabel(game.status)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt>Round</dt>
            <dd className="mt-1 font-black text-[#24160d]">
              {game.roundNumber}
            </dd>
          </div>
          <div className="min-w-0">
            <dt>{metric.label}</dt>
            <dd className="mt-1 font-black text-[#1f7a71]">
              {metric.value}
            </dd>
          </div>
        </dl>

        <dl className="grid gap-3 rounded-lg border-2 border-[#5f351c]/20 bg-[#f3d29d]/35 p-3 text-center text-sm text-[#5f351c] sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="truncate" title={game.playerX.displayName}>
              {game.playerX.displayName}
            </dt>
            <dd className="mt-1 text-2xl font-black text-[#24160d]">
              {game.score.xWins}
            </dd>
          </div>
          <div className="min-w-0">
            <dt>Draws</dt>
            <dd className="mt-1 text-2xl font-black text-[#24160d]">
              {game.score.draws}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="truncate" title={playerOName}>
              {playerOName}
            </dt>
            <dd className="mt-1 text-2xl font-black text-[#24160d]">
              {game.score.oWins}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
