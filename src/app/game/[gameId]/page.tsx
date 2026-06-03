import { GameBoard } from "@/components/game-board";
import { GameStatus } from "@/components/game-status";
import { normalizeRoomCode, previewGame } from "@/lib/game";

type GamePageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;
  const roomCode = normalizeRoomCode(gameId);
  const game = {
    ...previewGame,
    gameId: roomCode,
    joinCode: roomCode,
  };

  return (
    <main className="wood-page min-h-screen px-5 py-8 text-[#24160d] sm:py-10">
      <section className="mx-auto grid w-full max-w-2xl gap-5">
        <GameStatus game={game} />
        <GameBoard board={game.board} interactive />
      </section>
    </main>
  );
}
