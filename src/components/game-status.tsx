import Link from "next/link";
import { GameState, markLabel, statusLabel } from "@/lib/game";
import { clearGameSession, GameSession } from "@/lib/session";

type GameStatusProps = {
  game: GameState;
  session: GameSession | null;
};

export function GameStatus({ game, session }: GameStatusProps) {
  return (
    <section className="wood-panel rounded-xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-[#1f7a71]">Room</p>
          <h1 className="mt-1 break-all font-mono text-3xl font-black text-[#5f351c]">
            {game.joinCode}
          </h1>
        </div>

        <Link
          href="/"
          onClick={clearGameSession}
          className="w-fit rounded-lg border-2 border-[#5f351c]/35 bg-[#fff6df] px-4 py-2 text-sm font-black text-[#5f351c] transition hover:border-[#5f351c]"
        >
          New game
        </Link>
      </div>

      <dl className="mt-5 grid gap-3 border-t-2 border-[#5f351c]/20 pt-4 text-sm text-[#5f351c] sm:grid-cols-4">
        <div>
          <dt>Status</dt>
          <dd className="mt-1 font-black text-[#24160d]">
            {statusLabel(game.status)}
          </dd>
        </div>
        <div>
          <dt>Next turn</dt>
          <dd className="mt-1 font-black text-[#1f7a71]">
            {markLabel(game.nextTurn)}
          </dd>
        </div>
        <div>
          <dt>Players</dt>
          <dd className="mt-1 font-black text-[#24160d]">
            {game.playerX.displayName} vs{" "}
            {game.playerO?.displayName ?? "Waiting"}
          </dd>
        </div>
        <div>
          <dt>You</dt>
          <dd className="mt-1 font-black text-[#24160d]">
            {session
              ? `${session.displayName} (${markLabel(session.playerMark)})`
              : "Preview"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
